import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { dateBR, shippingOf } from "@/lib/admin-queries";
import { formatPrice } from "@/lib/catalog";
import type { OrderLine } from "@/lib/checkout";

const orderQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const Route = createFileRoute("/_authenticated/admin/recibo/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(orderQuery(params.id)),
  component: Recibo,
});

function Recibo() {
  const { id } = Route.useParams();
  const { data: order } = useSuspenseQuery(orderQuery(id));
  if (!order) return <p>Pedido não encontrado.</p>;
  if (order.status !== "pago") return <p>O recibo só fica disponível para pedidos pagos.</p>;
  const s = shippingOf(order);
  const items = (order.items as unknown as OrderLine[]) ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex justify-end print:hidden">
        <Button variant="pill" onClick={() => window.print()}>
          <Printer /> Imprimir ou salvar PDF
        </Button>
      </div>
      <article className="rounded-3xl border border-border bg-card p-8 print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="font-display text-3xl">Cia Cap</p>
            <p className="text-sm text-muted-foreground">Recibo de compra</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-muted-foreground">{dateBR(order.created_at)}</p>
          </div>
        </header>
        <section className="mt-5 text-sm">
          <p className="eyebrow text-muted-foreground">Cliente</p>
          <p className="mt-1 font-medium">{s.name}</p>
          {s.email && <p>{s.email}</p>}
          <p className="text-muted-foreground">
            {s.street}, {s.number}
            {s.complement ? ` — ${s.complement}` : ""} · {s.neighborhood} · {s.city}/{s.state} · CEP{" "}
            {s.cep}
          </p>
        </section>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 font-normal">Produto</th>
              <th className="py-2 text-center font-normal">Qtd.</th>
              <th className="py-2 text-right font-normal">Valor</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-border/60">
                <td className="py-2">{i.name}</td>
                <td className="py-2 text-center">{i.qty}</td>
                <td className="py-2 text-right">{formatPrice(i.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto mt-4 grid max-w-xs gap-1 text-sm">
          <div className="flex justify-between">
            <dt>Produtos</dt>
            <dd>{formatPrice(Number(order.subtotal))}</dd>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between">
              <dt>Desconto {order.coupon_code && `(${order.coupon_code})`}</dt>
              <dd>− {formatPrice(Number(order.discount))}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Frete{order.shipping_service ? ` (${order.shipping_service})` : ""}</dt>
            <dd>
              {Number(order.shipping_fee) === 0
                ? "Grátis"
                : formatPrice(Number(order.shipping_fee))}
            </dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-medium">
            <dt>Total pago</dt>
            <dd>{formatPrice(Number(order.total))}</dd>
          </div>
        </dl>
        <p className="mt-8 text-xs text-muted-foreground">
          Pagamento confirmado pelo Mercado Pago
          {order.mp_payment_id ? ` (nº ${order.mp_payment_id})` : ""}. Este recibo não substitui
          nota fiscal.
        </p>
      </article>
    </div>
  );
}
