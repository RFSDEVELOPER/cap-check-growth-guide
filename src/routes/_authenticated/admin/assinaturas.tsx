import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminPage, Empty, Pill, Stat, paymentTone } from "@/components/admin/AdminUI";
import { SyncPaymentsButton } from "@/components/admin/SyncPaymentsButton";
import { Button } from "@/components/ui/button";
import { adminCancelSubscription } from "@/lib/admin.functions";
import {
  adminCustomersQuery,
  adminPlansQuery,
  adminSubscriptionsQuery,
  dateBR,
} from "@/lib/admin-queries";
import { formatPrice } from "@/lib/catalog";
import { STATUS_LABEL } from "@/lib/checkout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/assinaturas")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminSubscriptionsQuery),
      context.queryClient.ensureQueryData(adminCustomersQuery),
      context.queryClient.ensureQueryData(adminPlansQuery),
    ]),
  component: Assinaturas,
});

const FILTERS = ["ativa", "pendente", "pausada", "cancelada", "todas"] as const;

function Assinaturas() {
  const { data: subs } = useSuspenseQuery(adminSubscriptionsQuery);
  const { data: customers } = useSuspenseQuery(adminCustomersQuery);
  const { data: plans } = useSuspenseQuery(adminPlansQuery);
  const cancel = useServerFn(adminCancelSubscription);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ativa");
  const [busyId, setBusyId] = useState<string | null>(null);

  const person = (uid: string) => customers.profiles.find((p) => p.id === uid);
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;
  const active = subs.filter((s) => s.status === "ativa");
  const list = filter === "todas" ? subs : subs.filter((s) => s.status === filter);

  async function onCancel(id: string, name: string) {
    if (
      !confirm(
        `Cancelar a assinatura de ${name}? A cobrança mensal no Mercado Pago será encerrada.`,
      )
    )
      return;
    setBusyId(id);
    try {
      const res = await cancel({ data: { id } });
      if (res.ok) {
        toast.success("Assinatura cancelada");
        queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      } else if (res.reason === "pagamento_indisponivel")
        toast.error("Mercado Pago ainda não está ativado.");
      else toast.error("Não foi possível cancelar agora.");
    } catch {
      toast.error("Não foi possível cancelar agora.");
    }
    setBusyId(null);
  }

  return (
    <AdminPage
      title="Assinaturas"
      description="Quem assina cada plano, situação do pagamento mensal e cancelamentos."
      actions={<SyncPaymentsButton />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Assinaturas ativas" value={active.length} />
        <Stat
          label="Receita mensal"
          value={formatPrice(active.reduce((s, x) => s + Number(x.amount), 0))}
        />
        <Stat
          label="Aguardando pagamento"
          value={subs.filter((s) => s.status === "pendente").length}
        />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-secondary",
            )}
          >
            {f === "todas" ? "Todas" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">
        {list.length === 0 ? (
          <div className="p-6">
            <Empty>Nenhuma assinatura neste filtro.</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((s) => {
              const p = person(s.user_id);
              const name = p?.full_name ?? p?.email ?? "Paciente";
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"
                >
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-muted-foreground">
                      Plano {planName(s.plan_id)} · {formatPrice(Number(s.amount))}/mês · desde{" "}
                      {dateBR(s.created_at)}
                    </p>
                    <p className="text-muted-foreground">
                      {[p?.email, p?.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone={paymentTone(s.status)}>{STATUS_LABEL[s.status] ?? s.status}</Pill>
                    {["ativa", "pausada", "pendente"].includes(s.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={busyId === s.id}
                        onClick={() => onCancel(s.id, name)}
                      >
                        {busyId === s.id && <Loader2 className="animate-spin" />} Cancelar
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminPage>
  );
}
