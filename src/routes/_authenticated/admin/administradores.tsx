import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mail, ShieldCheck, UserMinus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminPage, Box, Empty, Pill } from "@/components/admin/AdminUI";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminEmailSchema } from "@/lib/admin-users";
import { inviteAdmin, listAdmins, revokeAdmin } from "@/lib/admin-users.functions";
import { useAuth } from "@/lib/auth";
import { dateBR } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/admin/administradores")({
  head: () => ({
    meta: [
      { title: "Administradores — Cia Cap" },
      { name: "description", content: "Convites e controle de acesso à administração da Cia Cap." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Administradores — Cia Cap" },
      { property: "og:description", content: "Gestão segura dos administradores da Cia Cap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Administradores,
});

function friendlyError(error: unknown): string {
  return error instanceof Error && error.message === "Acesso restrito à administração"
    ? error.message
    : "Não foi possível concluir a solicitação. Tente novamente.";
}

function Administradores() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAdmins = useServerFn(listAdmins);
  const invite = useServerFn(inviteAdmin);
  const revoke = useServerFn(revokeAdmin);
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "administrators"],
    queryFn: () => fetchAdmins(),
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin", "administrators"] });
  }

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = adminEmailSchema.safeParse(new FormData(form).get("email"));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Informe um e-mail válido");
      return;
    }
    setInviting(true);
    try {
      const result = await invite({ data: { email: parsed.data } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      form.reset();
      toast.success(result.message);
      await refresh();
    } catch (cause) {
      toast.error(friendlyError(cause));
    } finally {
      setInviting(false);
    }
  }

  async function onRevoke(userId: string) {
    setRemovingId(userId);
    try {
      const result = await revoke({ data: { userId } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (userId === user?.id) {
        navigate({ to: "/conta" });
        return;
      }
      await refresh();
    } catch (cause) {
      toast.error(friendlyError(cause));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <AdminPage
      title="Administradores"
      description="Convide pessoas de confiança e controle quem pode acessar o painel."
    >
      <div className="grid max-w-5xl gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          <Box title="Acesso ao painel">
            {isLoading ? (
              <div className="flex justify-center py-8" aria-label="Carregando administradores">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="grid justify-items-center gap-3 py-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Não foi possível carregar os administradores.
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : !data?.admins.length ? (
              <Empty>Nenhum administrador encontrado.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {data.admins.map((admin) => (
                  <li
                    key={admin.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-all font-medium">{admin.email}</p>
                        {admin.id === user?.id && <Pill tone="good">Você</Pill>}
                        {data.admins.length === 1 && <Pill tone="warn">Último administrador</Pill>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Desde {dateBR(admin.grantedAt)} ·{" "}
                        {admin.grantedByEmail
                          ? `concedido por ${admin.grantedByEmail}`
                          : "cadastro inicial"}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={removingId === admin.id}
                          aria-label={`Remover acesso de ${admin.email}`}
                        >
                          {removingId === admin.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <UserMinus />
                          )}
                          Remover acesso
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover acesso de administrador?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {admin.id === user?.id
                              ? "Você perderá o acesso ao painel e voltará para a sua conta."
                              : "Esta pessoa deixará de acessar o painel, mas sua conta e seus pedidos serão preservados."}{" "}
                            O último administrador não pode remover o próprio acesso.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onRevoke(admin.id)}>
                            Confirmar remoção
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
            )}
          </Box>

          {!!data?.pending.length && (
            <Box title="Convites aguardando confirmação">
              <ul className="divide-y divide-border">
                {data.pending.map((inviteRow) => (
                  <li
                    key={inviteRow.id}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <Mail className="mt-0.5 size-4 shrink-0 text-copper" />
                    <div className="min-w-0">
                      <p className="break-all text-sm font-medium">{inviteRow.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Enviado em {dateBR(inviteRow.invitedAt)}
                        {inviteRow.invitedByEmail ? ` por ${inviteRow.invitedByEmail}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </div>

        <Box title="Convidar administrador" className="content-start">
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            Contas existentes recebem acesso imediatamente. Novas contas recebem um convite por
            e-mail e o acesso é ativado somente após a confirmação.
          </p>
          <form onSubmit={onInvite} className="grid gap-4" noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="admin-email">E-mail</Label>
              <Input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                placeholder="pessoa@empresa.com"
                className="h-11 rounded-xl"
                required
              />
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              {inviting ? "Processando…" : "Convidar administrador"}
            </Button>
          </form>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            O cadastro público continua criando somente clientes. Nenhum usuário é apagado ao
            remover o acesso.
          </p>
        </Box>
      </div>
    </AdminPage>
  );
}
