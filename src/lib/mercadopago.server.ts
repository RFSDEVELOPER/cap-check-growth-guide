import {
  ORDER_STATUS_FROM_MP,
  resolveOrderStatus,
  SUBSCRIPTION_STATUS_FROM_MP,
} from "@/lib/checkout";

const MP_API = "https://api.mercadopago.com";

const MP_TIMEOUT_MS = 10_000;
const MP_MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls the Mercado Pago API with a 10 s timeout. Reads (GET) and writes that carry an
 * idempotency key are retried up to 3 times on network errors and 5xx answers; anything else
 * is sent once, so a charge is never created twice by a retry.
 */
export async function mpRequest<T>(
  token: string,
  path: string,
  init: {
    method?: string;
    body?: unknown;
    idempotencyKey?: string;
    /** Base wait between attempts in ms (grows with each attempt). */
    retryBaseMs?: number;
  } = {},
): Promise<T> {
  const method = init.method ?? "GET";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;

  const maxAttempts = method === "GET" || init.idempotencyKey ? MP_MAX_ATTEMPTS : 1;
  const baseMs = init.retryBaseMs ?? 400;

  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${MP_API}${path}`, {
        method,
        headers,
        body: init.body ? JSON.stringify(init.body) : null,
        signal: AbortSignal.timeout(MP_TIMEOUT_MS),
      });
    } catch (e) {
      if (attempt < maxAttempts) {
        await sleep(baseMs * attempt);
        continue;
      }
      console.error(`Mercado Pago ${path} unreachable after ${attempt} attempt(s)`, e);
      throw new Error("Mercado Pago request failed [network]");
    }

    if (res.status >= 500 && attempt < maxAttempts) {
      await res.text().catch(() => "");
      await sleep(baseMs * attempt);
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      console.error(`Mercado Pago ${path} failed [${res.status}]: ${text}`);
      throw new Error(`Mercado Pago request failed [${res.status}]`);
    }
    return (await res.json()) as T;
  }
}

interface MpPayment {
  id: number;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
}

interface MpPreapproval {
  id: string;
  status: string;
  external_reference: string | null;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Re-reads a payment from Mercado Pago and updates the matching order. */
export async function applyPayment(token: string, paymentId: string) {
  const payment = await mpRequest<MpPayment>(
    token,
    `/v1/payments/${encodeURIComponent(paymentId)}`,
  );
  if (!payment.external_reference) return;
  await applyPaymentObject(payment);
}

async function applyPaymentObject(payment: MpPayment) {
  const db = await admin();
  const { data: order } = await db
    .from("orders")
    .select("id, total, status")
    .eq("id", payment.external_reference!)
    .maybeSingle();
  if (!order) return;

  let status = ORDER_STATUS_FROM_MP[payment.status] ?? "pendente";
  // Only accept "paid" when Mercado Pago charged the full order amount in BRL.
  if (
    status === "pago" &&
    (payment.currency_id !== "BRL" || payment.transaction_amount + 0.01 < Number(order.total))
  ) {
    console.error(`Payment ${payment.id} amount mismatch for order ${order.id}`);
    status = "pendente";
  }
  // A paid order is final (only a refund can change it), so an older or second
  // attempt that was rejected or cancelled never overwrites an approved payment.
  const next = resolveOrderStatus(order.status, status);
  if (next !== order.status || order.status !== "pago") {
    await db
      .from("orders")
      .update({ status: next, mp_payment_id: String(payment.id) })
      .eq("id", order.id);
  }
  status = next;

  // Lower stock and count the coupon use once the order is paid (runs only once per order).
  if (status === "pago") {
    const { error } = await db.rpc("finalize_paid_order", { _order_id: order.id });
    if (error) console.error(`Stock update failed for order ${order.id}`, error);
  }

  // A refund puts the items back in stock and gives the coupon use back (once per order).
  // The function comes from sql/etapa3-banco.sql; until it is applied the call only logs.
  if (status === "reembolsado" && order.status !== "reembolsado") {
    const { error } = await db.rpc(
      "restore_refunded_order" as never,
      { _order_id: order.id } as never,
    );
    if (error) console.error(`Stock restore failed for order ${order.id}`, error);
  }
}

/** Looks up the latest payment for an order (used when the patient returns from checkout). */
export async function syncOrder(token: string, orderId: string) {
  const result = await mpRequest<{ results: MpPayment[] }>(
    token,
    `/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc&limit=10`,
  );
  // An approved payment wins over newer failed attempts for the same order.
  const chosen =
    result.results.find((p) => ORDER_STATUS_FROM_MP[p.status] === "pago") ?? result.results[0];
  if (chosen) await applyPaymentObject(chosen);
}

/** Re-reads a subscription from Mercado Pago and updates the matching row. */
export async function applyPreapproval(token: string, preapprovalId: string) {
  const pre = await mpRequest<MpPreapproval>(
    token,
    `/preapproval/${encodeURIComponent(preapprovalId)}`,
  );
  const db = await admin();
  const status = SUBSCRIPTION_STATUS_FROM_MP[pre.status] ?? "pendente";
  const query = db.from("subscriptions").update({ status, mp_preapproval_id: pre.id });
  if (pre.external_reference) {
    await query.eq("id", pre.external_reference);
  } else {
    await query.eq("mp_preapproval_id", pre.id);
  }
}

/** Verifies Mercado Pago's x-signature header (HMAC-SHA256) when a webhook secret is configured. */
export async function verifyMpSignature(
  secret: string,
  signatureHeader: string | null,
  requestId: string | null,
  dataId: string,
  maxAgeMs = 15 * 60_000,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // Reject old notifications (replay). Mercado Pago sends ts in milliseconds.
  const tsMs = Number(ts) < 1e12 ? Number(ts) * 1000 : Number(ts);
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > maxAgeMs) return false;

  let manifest = `id:${dataId.toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}
