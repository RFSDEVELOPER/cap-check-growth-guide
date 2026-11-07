import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPlanById } from "@/lib/catalog";
import { buildOrder, planMonthlyAmount } from "@/lib/checkout";
import { applyPreapproval, mpRequest, syncOrder } from "@/lib/mercadopago.server";

export type CheckoutResult =
  | { url: string }
  | { error: "pagamento_indisponivel" | "endereco_incompleto" | "ja_assinante" | "falha" };

const originSchema = z
  .string()
  .url()
  .max(200)
  .refine((u) => /^https?:\/\//.test(u), "Origem inválida");

export const startCartCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        items: z
          .array(z.object({ id: z.string().min(1).max(60), qty: z.number().int().min(1).max(10) }))
          .min(1)
          .max(20),
        origin: originSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
    if (!token) return { error: "pagamento_indisponivel" };

    const order = buildOrder(data.items);

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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const shipping = {
      name: profile.full_name,
      phone: profile.phone,
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
        total: order.total,
        shipping: shipping as never,
      })
      .select("id")
      .single();
    if (error || !created) {
      console.error("Order insert failed", error);
      return { error: "falha" };
    }

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
              ...order.lines.map((l) => ({
                id: l.id,
                title: l.name,
                quantity: l.qty,
                unit_price: l.unitPrice,
                currency_id: "BRL",
              })),
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
    const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
    if (!token) return { error: "pagamento_indisponivel" };

    const plan = getPlanById(data.planId)!;
    const amount = planMonthlyAmount(plan.id);

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
    const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
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
