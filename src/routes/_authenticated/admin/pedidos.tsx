import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminPage, Empty, Field, Pill, fulfillmentTone, paymentTone } from "@/components/admin/AdminUI";
import { SyncPaymentsButton } from "@/components/admin/SyncPaymentsButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminOrdersQuery, dateBR, isLate, shippingOf, type OrderRow } from "@/lib/admin-queries";
import { formatPrice } from "@/lib/catalog";
import { FULFILLMENT_LABEL, STATUS_LABEL, type FulfillmentStatus, type OrderLine } from "@/lib/checkout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminOrdersQuery),
  component: Pedidos,
});

const FILTERS = [
  { id: "enviar", label: "A enviar" },
  { id: "atrasados", label: "Atrasados" },
  { id: "enviados", label: "Enviados" },
  { id: "entregues", label: "Entregues" },
  { id: "pendentes", label: "Aguardando pagamento" },
  { id: "todos", label: "Todos" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

function matches(o: OrderRow, f: FilterId) {
  switch (f) {
    case "enviar":
      return o.status === "pago" && ["aguardando", "separando"].includes(o.fulfillment_status);
    case "atrasados":
      return isLate(o);
    case "enviados":
      return o.status === "pago" && o.fulfillment_status === "enviado";
    case "entregues":
      return o.fulfillment_status === "entregue";
    case "pendentes":
      return o.status === "pendente";
    default:
      return true;
  }
}

function Pedidos() {
  const { data: orders } = useSuspenseQuery(adminOrdersQuery);
  const [filter, setFilter] = useState<FilterId>("enviar");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (!matches(o, filter)) return false;
      if (!term) return true;
      const s = shippingOf(o);
      return [o.id, s.name, s.email, s.phone, o.tracking_code].some((v) => v?.toLowerCase().includes(term));
    });
  }, [orders, filter, q]);

  const open = orders.find((o) => o.id === openId) ?? null;

  return (
    <AdminPage
      title="Pedidos e entregas"
      description="Acompanhe pagamentos, marque envios, informe o código de rastreio e o prazo de entrega."
      actions={<SyncPaymentsButton />}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {FILTERS.map((f) => {
            const count = orders.filter((o) => matches(o, f.id)).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  filter === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary",
                )}
              >
                {f.label} <span className="font-mono text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, e-mail, pedido, rastreio"
            className="h-10 rounded-full bg-card pl-9"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        {list.length === 0 ? (
          <div className="p-6">
            <Empty>Nenhum pedido neste filtro.</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((o) => {
              const s = shippingOf(o);
              const items = (o.items as unknown as OrderLine[]) ?? [];
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(o.id)}
                    className="grid w-full gap-2 px-5 py-4 text-left text-sm transition-colors hover:bg-secondary/50 md:grid-cols-[1.4fr_1fr_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        <span className="font-mono text-muted-foreground">#{o.id.slice(0, 8)}</span> · {s.name ?? "Cliente"}
                      </p>
                      <p className="truncate text-muted-foreground">
                        {items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                      </p>
                    </div>
                    <div className="text-muted-foreground">
                      <p>
                        {dateBR(o.created_at)} · <strong className="text-foreground">{formatPrice(Number(o.total))}</strong>
                      </p>
                      <p>
                        {s.city ? `${s.city}/${s.state}` : "—"} · previsão {dateBR(o.estimated_delivery)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 md:justify-end">
                      <Pill tone={paymentTone(o.status)}>{STATUS_LABEL[o.status] ?? o.status}</Pill>
                      {o.status === "pago" && (
                        <Pill tone={fulfillmentTone(o.fulfillment_status)}>
                          {FULFILLMENT_LABEL[o.fulfillment_status as FulfillmentStatus]}
                        </Pill>
                      )}
                      {isLate(o) && <Pill tone="bad">Atrasado</Pill>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-background sm:max-w-lg">
          {open && <OrderDetail key={open.id} order={open} onDone={() => setOpenId(null)} />}
        </SheetContent>
      </Sheet>
    </AdminPage>
  );
}

function OrderDetail({ order, onDone }: { order: OrderRow; onDone: () => void }) {
  const queryClient = useQueryClient();
  const s = shippingOf(order);
  const items = (order.items as unknown as OrderLine[]) ?? [];
  const [status, setStatus] = useState<FulfillmentStatus>(order.fulfillment_status as FulfillmentStatus);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim() || null;
    const now = new Date().toISOString();
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({
        fulfillment_status: status,
        carrier: str("carrier"),
        tracking_code: str("tracking_code"),
        estimated_delivery: str("estimated_delivery"),
        customer_note: str("customer_note"),
        shipped_at: status === "enviado" || status === "entregue" ? (order.shipped_at ?? now) : order.shipped_at,
        delivered_at: status === "entregue" ? (order.delivered_at ?? now) : null,
      })
      .eq("id", order.id);
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar o pedido."); return; }
    toast.success("Pedido atualizado");
    queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    onDone();
  }

  return (
    <div className="pb-10">
      <SheetHeader className="px-0">
        <SheetTitle className="font-display text-2xl">Pedido #{order.id.slice(0, 8)}</SheetTitle>
      </SheetHeader>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Pill tone={paymentTone(order.status)}>{STATUS_LABEL[order.status] ?? order.status}</Pill>
        {isLate(order) && (
          <Pill tone="bad">
            <AlertTriangle className="mr-1 size-3" /> Prazo vencido
          </Pill>
        )}
      </div>

      <section className="mt-6 rounded-2xl bg-secondary/60 p-4 text-sm">
        <h3 className="eyebrow text-muted-foreground">Itens</h3>
        <ul className="mt-2 grid gap-1">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>
                {i.qty}× {i.name}
              </span>
              <span>{formatPrice(i.subtotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 grid gap-1 border-t border-border pt-3">
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-copper">
              <dt>Desconto {order.coupon_code && `(${order.coupon_code})`}</dt>
              <dd>− {formatPrice(Number(order.discount))}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Frete</dt>
            <dd>{Number(order.shipping_fee) === 0 ? "Grátis" : formatPrice(Number(order.shipping_fee))}</dd>
          </div>
          <div className="flex justify-between font-medium">
            <dt>Total</dt>
            <dd>{formatPrice(Number(order.total))}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Feito em {new Date(order.created_at).toLocaleString("pt-BR")}
          {order.mp_payment_id && ` · pagamento Mercado Pago ${order.mp_payment_id}`}
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-border p-4 text-sm">
        <h3 className="eyebrow text-muted-foreground">Entregar para</h3>
        <p className="mt-2 font-medium">{s.name ?? "—"}</p>
        <p className="text-muted-foreground">
          {s.street}, {s.number}
          {s.complement ? ` — ${s.complement}` : ""}
          <br />
          {s.neighborhood} · {s.city}/{s.state} · CEP {s.cep}
        </p>
        <p className="mt-2 text-muted-foreground">
          {s.phone ?? "sem telefone"} {s.email ? `· ${s.email}` : ""}
        </p>
      </section>

      <form onSubmit={save} className="mt-6 grid gap-4">
        <Field label="Situação da entrega">
          <Select value={status} onValueChange={(v) => setStatus(v as FulfillmentStatus)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FULFILLMENT_LABEL) as FulfillmentStatus[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {FULFILLMENT_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Transportadora" htmlFor="carrier">
            <Input id="carrier" name="carrier" defaultValue={order.carrier ?? ""} placeholder="Correios, Jadlog…" className="h-11 rounded-xl" maxLength={60} />
          </Field>
          <Field label="Código de rastreio" htmlFor="tracking_code">
            <Input id="tracking_code" name="tracking_code" defaultValue={order.tracking_code ?? ""} className="h-11 rounded-xl font-mono" maxLength={60} />
          </Field>
        </div>
        <Field label="Previsão de entrega" htmlFor="estimated_delivery" hint="O cliente vê essa data na conta dele.">
          <Input id="estimated_delivery" name="estimated_delivery" type="date" defaultValue={order.estimated_delivery ?? ""} className="h-11 rounded-xl" />
        </Field>
        <Field label="Recado para o cliente" htmlFor="customer_note" hint="Aparece na conta do cliente, junto ao pedido.">
          <Textarea id="customer_note" name="customer_note" defaultValue={order.customer_note ?? ""} maxLength={300} className="rounded-xl" />
        </Field>
        <Button type="submit" variant="pill" size="xl" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Salvar pedido
        </Button>
        {order.status !== "pago" && (
          <p className="text-xs text-muted-foreground">
            Este pedido ainda não está pago. Envie só depois que o pagamento for confirmado.
          </p>
        )}
      </form>
    </div>
  );
}
