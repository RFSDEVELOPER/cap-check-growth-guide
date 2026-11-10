import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  addDaysISO,
  buildOrder,
  CheckoutError,
  type CartLine,
  type CheckoutErrorCode,
  type OrderDraft,
} from "@/lib/checkout";
import { effectivePrice } from "@/lib/catalog";
import { getMpToken } from "@/lib/credentials.server";
import { applyPreapproval, mpRequest, syncOrder } from "@/lib/mercadopago.server";
import { quoteShipping, type ShippingOption } from "@/lib/shipping.server";
import { loadCatalog, loadCoupon } from "@/lib/store.server";

export type CheckoutFailure =
  "pagamento_indisponivel" | "endereco_incompleto" | "ja_assinante" | "falha" | CheckoutErrorCode;

export type CheckoutResult = { url: string } | { error: CheckoutFailure; detail?: string };

const originSchema = z
  .string()
  .url()
  .max(200)
  .refine((u) => /^https?:\/\//.test(u), "Origem inválida");

const cartSchema = z.object({
  items: z
    .array(z.object({ id: z.string().min(1).max(60), qty: z.number().int().min(1).max(10) }))
    .min(1)
    .max(20),
  coupon: z
    .string()
    .trim()
    .max(30)
    .transform((c) => c.toUpperCase())
    .optional(),
  shippingService: z
    .string()
    .regex(/^[0-9]{1,6}$/)
    .optional(),
});

/** Our own site address. Uses SITE_URL when set, so return and notification URLs never depend on the browser. */
function siteOrigin(clientOrigin: string): string {
  const configured = process.env["SITE_URL"]?.trim().replace(/\/+$/, "");
  return configured && /^https?:\/\//.test(configured) ? configured : clientOrigin;
}

const cepSchema = z
  .string()
  .transform((c) => c.replace(/\D/g, ""))
  .pipe(z.string().length(8));

async function shippingItems(items: CartLine[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("products")
    .select("id, price, promo_price, promo_until, weight_kg, length_cm, width_cm, height_cm")
    .in(
      "id",
      items.map((i) => i.id),
    );
  return items.flatMap((i) => {
    const p = data?.find((d) => d.id === i.id);
    if (!p) return [];
    return [
      {
        id: p.id,
        qty: i.qty,
        price: effectivePrice({
          price: Number(p.price),
          promoPrice: p.promo_price === null ? null : Number(p.promo_price),
          promoUntil: p.promo_until,
        }),
        weightKg: Number(p.weight_kg),
        lengthCm: p.length_cm,
        widthCm: p.width_cm,
        heightCm: p.height_cm,
      },
    ];
  });
}

export type ShippingQuoteResult =
  | { mode: "fixo" }
  | { mode: "cotacao"; options: ShippingOption[] }
  | { error: "cep_invalido" | "falha" };

/** Quotes Correios and Jadlog for the cart by CEP (falls back to the fixed fee when not configured). */
export const quoteShippingByCep = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ cep: z.string().max(12), items: cartSchema.shape.items }).parse(input),
  )
  .handler(async ({ data }): Promise<ShippingQuoteResult> => {
    const cep = cepSchema.safeParse(data.cep);
    if (!cep.success) return { error: "cep_invalido" };
    try {
      const options = await quoteShipping(cep.data, await shippingItems(data.items));
      return options ? { mode: "cotacao", options } : { mode: "fixo" };
    } catch {
      return { error: "falha" };
    }
  });

async function priceCart(
  items: CartLine[],
  couponCode: string | undefined,
  shipping?: { cep: string | null | undefined; service: string | undefined },
): Promise<OrderDraft> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const catalog = await loadCatalog(supabaseAdmin, { withImages: false });
  let coupon = null;
  if (couponCode) {
    coupon = await loadCoupon(supabaseAdmin, couponCode);
    if (!coupon) throw new CheckoutError("cupom_invalido", "Cupom não encontrado");
  }
  let choice = null;
  const cep = shipping?.cep ? cepSchema.safeParse(shipping.cep) : null;
  if (cep?.success) {
    const options = await quoteShipping(cep.data, await shippingItems(items));
    if (options) {
      const picked = options.find((o) => o.id === shipping?.service);
      if (!picked) throw new CheckoutError("frete_indisponivel", "Escolha uma opção de frete");
      choice = { service: picked.name, price: picked.price, days: picked.days };
    }
  }
  return buildOrder(items, catalog, coupon, new Date(), choice);
}

export type QuoteResult = { order: OrderDraft } | { error: CheckoutFailure; detail?: string };

/** Prices the cart on the server (promo prices, stock, coupon and shipping). */
export const quoteCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => cartSchema.extend({ cep: z.string().max(12).optional() }).parse(input))
  .handler(async ({ data }): Promise<QuoteResult> => {
    try {
      return {
        order: await priceCart(data.items, data.coupon || undefined, {
          cep: data.cep,
          service: data.shippingService,
        }),
      };
    } catch (e) {
      if (e instanceof CheckoutError)
        return { error: e.code, ...(e.detail ? { detail: e.detail } : {}) };
      console.error("Quote failed", e);
      return { error: "falha" };
    }
  });

/**
 * Creates the Mercado Pago checkout preference for an order. With a discount, one line with the
 * discounted products value is sent so the Mercado Pago total always matches the order total.
 */
async function createOrderPreference(
  token: string,
  args: {
    orderId: string;
    order: Pick<OrderDraft, "lines" | "subtotal" | "discount" | "shipping" | "couponCode">;
    payerName: string;
    payerEmail: string | null;
    origin: string;
    idempotencyKey: string;
  },
) {
  const { order, origin } = args;
  const productItems =
    order.discount > 0
      ? [
          {
            id: "pedido",
            title: `Pedido Cia Cap (${order.lines.reduce((sum, l) => sum + l.qty, 0)} itens, cupom ${order.couponCode})`,
            quantity: 1,
            unit_price: Math.round((order.subtotal - order.discount) * 100) / 100,
            currency_id: "BRL",
          },
        ]
      : order.lines.map((l) => ({
          id: l.id,
          title: l.name,
          quantity: l.qty,
          unit_price: l.unitPrice,
          currency_id: "BRL",
        }));
  const back = `${origin}/conta?pedido=${args.orderId}`;
  return mpRequest<{ id: string; init_point: string; sandbox_init_point?: string }>(
    token,
    "/checkout/preferences",
    {
      method: "POST",
      idempotencyKey: args.idempotencyKey,
      body: {
        items: [
          ...productItems,
          ...(order.shipping > 0
            ? [
                {
                  id: "frete",
                  title: "Frete",
                  quantity: 1,
                  unit_price: order.shipping,
                  currency_id: "BRL",
                },
              ]
            : []),
        ],
        payer: { name: args.payerName, email: args.payerEmail ?? undefined },
        external_reference: args.orderId,
        back_urls: {
          success: `${back}&resultado=ok`,
          pending: `${back}&resultado=pendente`,
          failure: `${back}&resultado=falha`,
        },
        ...(origin.startsWith("https://")
          ? {
              auto_return: "approved",
              notification_url: `${origin}/api/public/mercadopago/webhook`,
            }
          : {}),
        statement_descriptor: "CIA CAP",
      },
    },
  );
}

export const startCartCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => cartSchema.extend({ origin: originSchema }).parse(input))
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const token = await getMpToken();
    if (!token) return { error: "pagamento_indisponivel" };

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (
      !profile?.full_name ||
      !profile.cep ||
      !profile.street ||
      !profile.number ||
      !profile.city ||
      !profile.state
    ) {
      return { error: "endereco_incompleto" };
    }

    let order: OrderDraft;
    try {
      order = await priceCart(data.items, data.coupon || undefined, {
        cep: profile.cep,
        service: data.shippingService,
      });
    } catch (e) {
      if (e instanceof CheckoutError)
        return { error: e.code, ...(e.detail ? { detail: e.detail } : {}) };
      console.error("Pricing failed", e);
      return { error: "falha" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const shipping = {
      name: profile.full_name,
      phone: profile.phone,
      email: profile.email,
      cep: profile.cep,
      street: profile.street,
      number: profile.number,
      complement: profile.complement,
      neighborhood: profile.neighborhood,
      city: profile.city,
      state: profile.state,
    };

    const { data: created, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
        items: order.lines as never,
        subtotal: order.subtotal,
        discount: order.discount,
        shipping_fee: order.shipping,
        shipping_service: order.shippingService,
        coupon_code: order.couponCode,
        total: order.total,
        shipping: shipping as never,
        estimated_delivery: addDaysISO(new Date(), order.deliveryDays),
      })
      .select("id")
      .single();
    if (error || !created) {
      console.error("Order insert failed", error);
      return { error: "falha" };
    }

    try {
      const pref = await createOrderPreference(token, {
        orderId: created.id,
        order,
        payerName: profile.full_name,
        payerEmail: profile.email,
        origin: siteOrigin(data.origin),
        idempotencyKey: created.id,
      });
      await supabaseAdmin.from("orders").update({ mp_preference_id: pref.id }).eq("id", created.id);
      return { url: pref.init_point };
    } catch (e) {
      console.error("Mercado Pago preference failed", e);
      await supabaseAdmin.from("orders").update({ status: "cancelado" }).eq("id", created.id);
      return { error: "falha" };
    }
  });

export const startPlanSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ planId: z.enum(["essencial", "completo", "avancado"]), origin: originSchema })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const token = await getMpToken();
    if (!token) return { error: "pagamento_indisponivel" };

    // Price comes from the plans table managed in the admin area.
    const { data: plan } = await context.supabase
      .from("plans")
      .select("id, name, price, active")
      .eq("id", data.planId)
      .eq("active", true)
      .maybeSingle();
    if (!plan) return { error: "falha" };
    const amount = Number(plan.price);

    // A pending subscription may already be authorized at Mercado Pago while the
    // notification is late: refresh it first so the patient is never charged twice.
    const { data: pendingSubs } = await context.supabase
      .from("subscriptions")
      .select("id, mp_preapproval_id")
      .eq("user_id", context.userId)
      .eq("status", "pendente");
    for (const sub of pendingSubs ?? []) {
      if (!sub.mp_preapproval_id) continue;
      try {
        await applyPreapproval(token, sub.mp_preapproval_id);
      } catch (e) {
        console.error("Pending subscription refresh failed", e);
        return { error: "falha" };
      }
    }

    const { data: active } = await context.supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", context.userId)
      .in("status", ["ativa", "pausada"])
      .limit(1);
    if (active && active.length > 0) return { error: "ja_assinante" };

    // Never leave an authorizable Mercado Pago agreement open while creating another.
    for (const sub of pendingSubs ?? []) {
      if (sub.mp_preapproval_id) {
        try {
          await mpRequest(token, `/preapproval/${encodeURIComponent(sub.mp_preapproval_id)}`, {
            method: "PUT", body: { status: "cancelled" },
          });
        } catch { return { error: "falha" }; }
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("subscriptions").update({ status: "cancelada" })
        .eq("id", sub.id).eq("status", "pendente");
      if (error) return { error: "falha" };
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    const email = profile?.email ?? (context.claims as { email?: string }).email;
    if (!email) return { error: "falha" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin
      .from("subscriptions")
      .insert({ user_id: context.userId, plan_id: plan.id, amount })
      .select("id")
      .single();
    if (error || !created) {
      console.error("Subscription insert failed", error);
      return { error: "falha" };
    }

    try {
      const pre = await mpRequest<{ id: string; init_point: string }>(token, "/preapproval", {
        method: "POST",
        idempotencyKey: created.id,
        body: {
          reason: `Cia Cap — Plano ${plan.name}`,
          external_reference: created.id,
          payer_email: email,
          back_url: `${siteOrigin(data.origin)}/conta?assinatura=${created.id}`,
          status: "pending",
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: amount,
            currency_id: "BRL",
          },
        },
      });
      await supabaseAdmin
        .from("subscriptions")
        .update({ mp_preapproval_id: pre.id })
        .eq("id", created.id);
      return { url: pre.init_point };
    } catch (e) {
      console.error("Mercado Pago preapproval failed", e);
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "cancelada" })
        .eq("id", created.id);
      return { error: "falha" };
    }
  });

export type RetryPaymentResult =
  | { url: string }
  | {
      error:
        | "pagamento_indisponivel"
        | "nao_encontrado"
        | "ja_pago"
        | "sem_estoque"
        | "expirado"
        | "falha";
    };

/** Orders can be paid again within this window; after that the prices must be recalculated in the cart. */
const RETRY_WINDOW_MS = 24 * 60 * 60_000;

/** Lets the patient pay again an order that is pending, refused or whose payment link failed. */
export const retryOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ orderId: z.string().uuid(), origin: originSchema }).parse(input),
  )
  .handler(async ({ data, context }): Promise<RetryPaymentResult> => {
    const token = await getMpToken();
    if (!token) return { error: "pagamento_indisponivel" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const load = () =>
      supabaseAdmin
        .from("orders")
        .select(
          "id, status, items, subtotal, discount, shipping_fee, coupon_code, shipping, created_at",
        )
        .eq("id", data.orderId)
        .eq("user_id", context.userId)
        .maybeSingle();

    let { data: order } = await load();
    if (!order) return { error: "nao_encontrado" };

    // The payment may have been approved while the patient was away: check before charging again.
    try {
      await syncOrder(token, order.id);
      order = (await load()).data ?? order;
    } catch (e) {
      console.error("Pre-retry sync failed", e);
      return { error: "falha" };
    }
    if (order.status === "pago" || order.status === "reembolsado") return { error: "ja_pago" };
    if (!["pendente", "recusado", "cancelado"].includes(order.status)) return { error: "falha" };
    if (Date.now() - new Date(order.created_at).getTime() > RETRY_WINDOW_MS) {
      return { error: "expirado" };
    }

    const lines = order.items as unknown as OrderDraft["lines"];
    const { data: stockRows } = await supabaseAdmin
      .from("products")
      .select("id, stock, active")
      .in(
        "id",
        lines.map((l) => l.id),
      );
    const short = lines.some((l) => {
      const row = stockRows?.find((r) => r.id === l.id);
      return !row || !row.active || row.stock < l.qty;
    });
    if (short) return { error: "sem_estoque" };

    const shipping = order.shipping as { name?: string; email?: string | null } | null;
    try {
      const pref = await createOrderPreference(token, {
        orderId: order.id,
        order: {
          lines,
          subtotal: Number(order.subtotal),
          discount: Number(order.discount),
          shipping: Number(order.shipping_fee),
          couponCode: order.coupon_code,
        },
        payerName: shipping?.name ?? "Cliente",
        payerEmail: shipping?.email ?? null,
        origin: siteOrigin(data.origin),
        idempotencyKey: `${order.id}:retry:${crypto.randomUUID()}`,
      });
      await supabaseAdmin
        .from("orders")
        .update({ status: "pendente", mp_preference_id: pref.id })
        .eq("id", order.id).in("status", ["pendente", "recusado", "cancelado"]);
      return { url: pref.init_point };
    } catch (e) {
      console.error("Retry preference failed", e);
      return { error: "falha" };
    }
  });

export type CancelSubscriptionResult =
  { ok: true } | { ok: false; reason: "nao_encontrada" | "pagamento_indisponivel" | "falha" };

/** Lets the patient cancel their own subscription (stops future charges at Mercado Pago). */
export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<CancelSubscriptionResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, mp_preapproval_id, status")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!sub) return { ok: false, reason: "nao_encontrada" };
    if (sub.status === "cancelada") return { ok: true };

    if (sub.mp_preapproval_id) {
      const token = await getMpToken();
      if (!token) return { ok: false, reason: "pagamento_indisponivel" };
      try {
        await mpRequest(token, `/preapproval/${encodeURIComponent(sub.mp_preapproval_id)}`, {
          method: "PUT",
          body: { status: "cancelled" },
        });
      } catch (e) {
        console.error("Cancel preapproval failed", e);
        return { ok: false, reason: "falha" };
      }
    }
    const { error } = await supabaseAdmin.from("subscriptions").update({ status: "cancelada" }).eq("id", sub.id);
    return error ? { ok: false, reason: "falha" } : { ok: true };
  });

/** Refreshes the patient's pending orders and subscriptions straight from Mercado Pago. */
export const syncMyPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = await getMpToken();
    if (!token) return { synced: 0 };

    const [{ data: orders }, { data: subs }] = await Promise.all([
      context.supabase
        .from("orders")
        .select("id")
        .eq("user_id", context.userId)
        .eq("status", "pendente")
        .order("created_at", { ascending: false })
        .limit(5),
      context.supabase
        .from("subscriptions")
        .select("id, mp_preapproval_id")
        .eq("user_id", context.userId)
        .in("status", ["pendente", "ativa", "pausada"])
        .not("mp_preapproval_id", "is", null)
        .limit(3),
    ]);

    let synced = 0;
    for (const o of orders ?? []) {
      try {
        await syncOrder(token, o.id);
        synced++;
      } catch (e) {
        console.error("Order sync failed", o.id, e);
      }
    }
    for (const s of subs ?? []) {
      if (!s.mp_preapproval_id) continue;
      try {
        await applyPreapproval(token, s.mp_preapproval_id);
        synced++;
      } catch (e) {
        console.error("Subscription sync failed", s.id, e);
      }
    }
    return { synced };
  });
