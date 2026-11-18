import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";
import { adminEmailSchema } from "@/lib/admin-users";

const genericMessage = "Não foi possível concluir a solicitação. Tente novamente.";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

async function authEmailMap(userIds: string[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const entries = await Promise.all(
    [...new Set(userIds)].map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      return [id, data.user?.email ?? null] as const;
    }),
  );
  return new Map(entries);
}

/** Lists current administrators and invitations waiting for email confirmation. */
export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [rolesResult, auditResult, pendingResult] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "admin")
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("admin_audit")
        .select("alvo_user_id, feito_por, criado_em")
        .eq("acao", "admin_concedido")
        .order("criado_em", { ascending: false }),
      supabaseAdmin
        .from("admin_audit")
        .select("alvo_user_id, feito_por, criado_em")
        .eq("acao", "convite_admin_pendente")
        .order("criado_em", { ascending: false }),
    ]);
    if (rolesResult.error || auditResult.error || pendingResult.error) {
      throw new Error("Não foi possível carregar os administradores");
    }

    const roles = rolesResult.data ?? [];
    const grants = auditResult.data ?? [];
    const pending = pendingResult.data ?? [];
    const emails = await authEmailMap([
      ...roles.map((role) => role.user_id),
      ...grants.flatMap((row) => [row.alvo_user_id, row.feito_por]),
      ...pending.flatMap((row) => [row.alvo_user_id, row.feito_por]),
    ]);
    const latestGrant = new Map<string, (typeof grants)[number]>();
    for (const grant of grants) {
      if (!latestGrant.has(grant.alvo_user_id)) latestGrant.set(grant.alvo_user_id, grant);
    }

    return {
      admins: roles.map((role) => {
        const grant = latestGrant.get(role.user_id);
        return {
          id: role.user_id,
          email: emails.get(role.user_id) ?? "E-mail indisponível",
          grantedAt: role.created_at,
          grantedBy: grant?.feito_por ?? null,
          grantedByEmail: grant ? (emails.get(grant.feito_por) ?? null) : null,
        };
      }),
      pending: pending.map((invite) => ({
        id: invite.alvo_user_id,
        email: emails.get(invite.alvo_user_id) ?? "E-mail indisponível",
        invitedAt: invite.criado_em,
        invitedByEmail: emails.get(invite.feito_por) ?? null,
      })),
    };
  });

async function findAuthUserByEmail(email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(genericMessage);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < perPage) return null;
  }
  throw new Error(genericMessage);
}

async function invitationRedirect(): Promise<string> {
  const configured = process.env["SITE_URL"]?.trim();
  if (configured) return new URL("/auth", configured).toString();
  const { getRequest } = await import("@tanstack/react-start/server");
  return new URL("/auth", getRequest().url).toString();
}

/** Grants admin to an existing account or sends an invitation activated after confirmation. */
export const inviteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ email: adminEmailSchema }).parse(input))
  .handler(async ({ data, context }): Promise<ActionResult> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email;

    try {
      const existing = await findAuthUserByEmail(email);
      if (existing) {
        const [{ data: role }, { data: pending }] = await Promise.all([
          supabaseAdmin
            .from("user_roles")
            .select("id")
            .eq("user_id", existing.id)
            .eq("role", "admin")
            .maybeSingle(),
          supabaseAdmin
            .from("admin_audit")
            .select("id")
            .eq("alvo_user_id", existing.id)
            .eq("acao", "convite_admin_pendente")
            .maybeSingle(),
        ]);
        if (role) return { ok: false, message: "Este usuário já é administrador." };
        if (pending) {
          return {
            ok: false,
            message: "Já existe um convite aguardando a confirmação deste e-mail.",
          };
        }

        const { error: grantError } = await supabaseAdmin
          .from("user_roles")
          .upsert(
            { user_id: existing.id, role: "admin" },
            { onConflict: "user_id,role", ignoreDuplicates: true },
          );
        if (grantError) return { ok: false, message: genericMessage };

        const { error: auditError } = await supabaseAdmin.from("admin_audit").insert({
          acao: "admin_concedido",
          alvo_user_id: existing.id,
          feito_por: context.userId,
        });
        if (auditError) return { ok: false, message: genericMessage };
        return { ok: true, message: `Acesso de administrador concedido a ${email}.` };
      }

      const { data: invitation, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: await invitationRedirect(),
        });
      if (inviteError || !invitation.user) {
        return { ok: false, message: "Não foi possível enviar o convite. Tente novamente." };
      }

      const { error: auditError } = await supabaseAdmin.from("admin_audit").insert({
        acao: "convite_admin_pendente",
        alvo_user_id: invitation.user.id,
        feito_por: context.userId,
      });
      if (auditError) return { ok: false, message: genericMessage };
      return {
        ok: true,
        message: `Convite enviado para ${email}. O acesso será ativado após a confirmação.`,
      };
    } catch {
      return { ok: false, message: genericMessage };
    }
  });

/** Removes an admin through an atomic database operation that protects the last administrator. */
export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ActionResult> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("revoke_admin", {
      _target_user_id: data.userId,
      _actor_user_id: context.userId,
    });
    if (error) {
      return {
        ok: false,
        message: error.message.includes("último administrador")
          ? "O último administrador não pode remover o próprio acesso."
          : genericMessage,
      };
    }

    const { error: auditError } = await supabaseAdmin.from("admin_audit").insert({
      acao: "admin_removido",
      alvo_user_id: data.userId,
      feito_por: context.userId,
    });
    if (auditError) return { ok: false, message: genericMessage };
    return { ok: true, message: "Acesso de administrador removido." };
  });
