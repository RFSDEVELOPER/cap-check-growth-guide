import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";

import {
  AdminPage,
  Box,
  Empty,
  Pill,
  Stat,
  fulfillmentTone,
  paymentTone,
} from "@/components/admin/AdminUI";
import { SetupWarnings } from "@/components/admin/SetupWarnings";
import { SyncPaymentsButton } from "@/components/admin/SyncPaymentsButton";
import {
  adminOrdersQuery,
  adminProductsQuery,
  adminSettingsQuery,
  adminSubscriptionsQuery,
  dateBR,
  isLate,
  shippingOf,
} from "@/lib/admin-queries";
import { formatPrice } from "@/lib/catalog";
import { monthStartBR } from "@/lib/dates";
import { FULFILLMENT_LABEL, STATUS_LABEL, type FulfillmentStatus } from "@/lib/checkout";

export const Route = createFileRoute("/_authenticated/admin/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminOrdersQuery),
      context.queryClient.ensureQueryData(adminProductsQuery),
      context.queryClient.ensureQueryData(adminSubscriptionsQuery),
      context.queryClient.ensureQueryData(adminSettingsQuery),
    ]),
  component: Overview,
});

function Overview() {
  const { data: orders } = useSuspenseQuery(adminOrdersQuery);
  const { data: products } = useSuspenseQuery(adminProductsQuery);
  const { data: subs } = useSuspenseQuery(adminSubscriptionsQuery);
  const { data: settings } = useSuspenseQuery(adminSettingsQuery);

  // "This month" is counted by payment date (paid_at, filled by sql/etapa3-banco.sql; older
  // orders fall back to the order date) in Brazil time.
  const monthStart = monthStartBR();
  const paidAt = (o: (typeof orders)[number]) =>
    (o as { paid_at?: string | null }).paid_at ?? o.created_at;
  const paidThisMonth = orders.filter((o) => o.status === "pago" && paidAt(o) >= monthStart);
  const revenue = paidThisMonth.reduce((s, o) => s + Number(o.total), 0);
  const toShip = orders.filter(
    (o) => o.status === "pago" && ["aguardando", "separando"].includes(o.fulfillment_status),
  );
  const late = orders.filter((o) => isLate(o));
  const active = subs.filter((s) => s.status === "ativa");
  const mrr = active.reduce((s, x) => s + Number(x.amount), 0);
  const lowLimit = settings?.low_stock_alert ?? 5;
  const lowStock = products.filter((p) => p.active && p.stock <= lowLimit);

  return (
    <AdminPage
      title="Visão geral"
      description="Resumo das vendas, entregas e estoque da Cia Cap."
      actions={<SyncPaymentsButton />}
    >
      <SetupWarnings />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Vendas pagas no mês"
          value={formatPrice(revenue)}
          hint={`${paidThisMonth.length} pedidos`}
        />
        <Stat label="Planos ativos" value={active.length} hint={`${formatPrice(mrr)} por mês`} />
        <Stat
          label="Pedidos a enviar"
          value={toShip.length}
          hint={late.length ? `${late.length} com prazo vencido` : "Nenhum atrasado"}
          tone={late.length ? "warn" : undefined}
        />
        <Stat
          label="Estoque baixo"
          value={lowStock.length}
          hint={`Produtos com ${lowLimit} unidades ou menos`}
          tone={lowStock.length ? "warn" : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Box
          title="Precisam de atenção"
          action={
            <Link to="/admin/pedidos" className="flex items-center gap-1 text-sm text-primary">
              Ver pedidos <ArrowRight className="size-4" />
            </Link>
          }
        >
          {toShip.length === 0 ? (
            <Empty>Nenhum pedido pago esperando envio.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {toShip.slice(0, 8).map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      #{o.id.slice(0, 8)} · {shippingOf(o).name ?? "Cliente"}
                    </p>
                    <p className="text-muted-foreground">
                      {formatPrice(Number(o.total))} · previsão {dateBR(o.estimated_delivery)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isLate(o) && (
                      <Pill tone="bad">
                        <AlertTriangle className="mr-1 size-3" /> Atrasado
                      </Pill>
                    )}
                    <Pill tone={fulfillmentTone(o.fulfillment_status)}>
                      {FULFILLMENT_LABEL[o.fulfillment_status as FulfillmentStatus]}
                    </Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Box>

        <Box
          title="Estoque baixo"
          action={
            <Link to="/admin/produtos" className="flex items-center gap-1 text-sm text-primary">
              Ver produtos <ArrowRight className="size-4" />
            </Link>
          }
        >
          {lowStock.length === 0 ? (
            <Empty>Todos os produtos com estoque acima do alerta.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="flex items-center gap-3">
                    <img src={p.image} alt="" className="size-10 rounded-xl bg-sage object-cover" />
                    {p.name}
                  </span>
                  <Pill tone={p.stock === 0 ? "bad" : "warn"}>
                    {p.stock === 0 ? "Esgotado" : `${p.stock} un.`}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </Box>
      </div>

      <Box title="Últimos pedidos" className="mt-6">
        {orders.length === 0 ? (
          <Empty>
            Nenhum pedido ainda. Eles aparecem aqui assim que alguém finaliza uma compra.
          </Empty>
        ) : (
          <ul className="divide-y divide-border">
            {orders.slice(0, 8).map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span>
                  <span className="font-mono text-muted-foreground">#{o.id.slice(0, 8)}</span> ·{" "}
                  {shippingOf(o).name ?? "Cliente"} · {dateBR(o.created_at)}
                </span>
                <span className="flex items-center gap-2">
                  <strong>{formatPrice(Number(o.total))}</strong>
                  <Pill tone={paymentTone(o.status)}>{STATUS_LABEL[o.status] ?? o.status}</Pill>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Box>
    </AdminPage>
  );
}
