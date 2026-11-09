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
import { getMpToken } from "@/lib/credentials.server";
import { applyPreapproval, mpRequest, syncOrder } from "@/lib/mercadopago.server";
import { quoteShipping, type ShippingOption } from "@/lib/shipping.server";
import { loadCatalog, loadCoupon } from "@/lib/store.server";

export type CheckoutFailure =
  | "pagamento_indisponivel"
  | "endereco_incompleto"
  | "ja_assinante"
  | "falha"
  | CheckoutErrorCode;

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
  shippingService: z.string().regex(/^[0-9]{1,6}$/).optional(),
});

const cepSchema = z.string().transform((c) => c.replace(/\D/g, "")).pipe(z.string().length(8));

async function shippingItems(items: CartLine[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("products")
    .select("id, price, promo_price, weight_kg, length_cm, width_cm, height_cm")
    .in("id", items.map((i) => i.id));
  return items.flatMap((i) => {
    const p = data?.find((d) => d.id === i.id);
    if (!p) return [];
    return [{
      id: p.id,
      qty: i.qty,
      price: Number(p.promo_price ?? p.price),
      weightKg: Number(p.weight_kg),
      lengthCm: p.length_cm,
      widthCm: p.width_cm,
      heightCm: p.height_cm,
    }];
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
        order: await priceCart(data.items, data.coupon || undefined, { cep: data.cep, service: data.shippingService }),
      };
    } catch (e) {
      if (e instanceof CheckoutError) return { error: e.code, ...(e.detail ? { detail: e.detail } : {}) };
      console.error("Quote failed", e);
      return { error: "falha" };
    }
  });

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
      if (e instanceof CheckoutError) return { error: e.code, ...(e.detail ? { detail: e.detail } : {}) };
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

    // With a discount, send one line with the discounted products value so the
    // Mercado Pago total always matches the order total.
    const productItems =
      order.discount > 0
        ? [
            {
              id: "pedido",
              title: `Pedido Cia Cap (${order.lines.reduce((s, l) => s + l.qty, 0)} itens, cupom ${order.couponCode})`,
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

    try {
      const back = `${data.origin}/conta?pedido=${created.id}`;
      const pref = await mpRequest<{ id: string; init_point: string; sandbox_init_point?: string }>(
        token,
        "/checkout/preferences",
        {
          method: "POST",
          idempotencyKey: created.id,
          body: {
            items: [
              ...productItems,
              ...(order.shipping > 0
                ? [{ id: "frete", title: "Frete", quantity: 1, unit_price: order.shipping, currency_id: "BRL" }]
                : []),
            ],
            payer: { name: profile.full_name, email: profile.email ?? undefined },
            external_reference: created.id,
            back_urls: { success: back, pending: back, failure: back },
            ...(data.origin.startsWith("https://")
              ? {
                  auto_return: "approved",
                  notification_url: `${data.origin}/api/public/mercadopago/webhook`,
                }
              : {}),
            statement_descriptor: "CIA CAP",
          },
        },
      );
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
    z.object({ planId: z.enum(["essencial", "completo", "avancado"]), origin: originSchema }).parse(input),
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

    const { data: active } = await context.supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "ativa")
      .limit(1);
    if (active && active.length > 0) return { error: "ja_assinante" };

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
          back_url: `${data.origin}/conta?assinatura=${created.id}`,
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
      await supabaseAdmin.from("subscriptions").update({ status: "cancelada" }).eq("id", created.id);
      return { error: "falha" };
    }
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
      try {
        await applyPreapproval(token, s.mp_preapproval_id!);
        synced++;
      } catch (e) {
        console.error("Subscription sync failed", s.id, e);
      }
    }
    return { synced };
  });
