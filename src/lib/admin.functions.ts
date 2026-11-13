import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";
import { getMpToken } from "@/lib/credentials.server";
import { applyPreapproval, mpRequest, syncOrder } from "@/lib/mercadopago.server";

/** Re-reads recent pending orders and open subscriptions from Mercado Pago. */
export const adminSyncPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const token = await getMpToken();
    if (!token) return { ok: false as const, reason: "pagamento_indisponivel" as const, synced: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 45 * 86_400_000).toISOString();
    const [{ data: orders }, { data: subs }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id")
        .eq("status", "pendente")
        .gte("created_at", since)
        .limit(50),
      supabaseAdmin
        .from("subscriptions")
        .select("mp_preapproval_id")
        .in("status", ["pendente", "ativa", "pausada"])
        .not("mp_preapproval_id", "is", null)
        .limit(100),
    ]);

    let synced = 0;
    for (const o of orders ?? []) {
      try {
        await syncOrder(token, o.id);
        synced++;
      } catch (e) {
        console.error("Admin order sync failed", o.id, e);
      }
    }
    for (const s of subs ?? []) {
      try {
        await applyPreapproval(token, s.mp_preapproval_id!);
        synced++;
      } catch (e) {
        console.error("Admin subscription sync failed", s.mp_preapproval_id, e);
      }
    }
    return { ok: true as const, synced };
  });

/** Cancels a patient's monthly plan on Mercado Pago and stores the new status. */
export const adminCancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, mp_preapproval_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!sub) return { ok: false as const, reason: "nao_encontrada" as const };

    if (sub.mp_preapproval_id) {
      const token = await getMpToken();
      if (!token) return { ok: false as const, reason: "pagamento_indisponivel" as const };
      try {
        await mpRequest(token, `/preapproval/${encodeURIComponent(sub.mp_preapproval_id)}`, {
          method: "PUT",
          body: { status: "cancelled" },
        });
      } catch (e) {
        console.error("Cancel preapproval failed", e);
        return { ok: false as const, reason: "falha" as const };
      }
    }
    await supabaseAdmin.from("subscriptions").update({ status: "cancelada" }).eq("id", sub.id);
    return { ok: true as const };
  });
