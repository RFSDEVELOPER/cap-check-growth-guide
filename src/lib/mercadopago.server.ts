import { ORDER_STATUS_FROM_MP, SUBSCRIPTION_STATUS_FROM_MP } from "@/lib/checkout";

const MP_API = "https://api.mercadopago.com";

export async function mpRequest<T>(
  token: string,
  path: string,
  init: { method?: string; body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;

  const res = await fetch(`${MP_API}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body ? JSON.stringify(init.body) : null,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Mercado Pago ${path} failed [${res.status}]: ${text}`);
    throw new Error(`Mercado Pago request failed [${res.status}]`);
  }
  return (await res.json()) as T;
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
  const payment = await mpRequest<MpPayment>(token, `/v1/payments/${encodeURIComponent(paymentId)}`);
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
  if (status === "pago" && (payment.currency_id !== "BRL" || payment.transaction_amount + 0.01 < Number(order.total))) {
    console.error(`Payment ${payment.id} amount mismatch for order ${order.id}`);
    status = "pendente";
  }
  // Never move a paid order back to pending because of an older notification.
  if (order.status === "pago" && status === "pendente") return;

  await db
    .from("orders")
    .update({ status, mp_payment_id: String(payment.id) })
    .eq("id", order.id);
}

/** Looks up the latest payment for an order (used when the patient returns from checkout). */
export async function syncOrder(token: string, orderId: string) {
  const result = await mpRequest<{ results: MpPayment[] }>(
    token,
    `/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc&limit=1`,
  );
  const latest = result.results[0];
  if (latest) await applyPaymentObject(latest);
}

/** Re-reads a subscription from Mercado Pago and updates the matching row. */
export async function applyPreapproval(token: string, preapprovalId: string) {
  const pre = await mpRequest<MpPreapproval>(token, `/preapproval/${encodeURIComponent(preapprovalId)}`);
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
