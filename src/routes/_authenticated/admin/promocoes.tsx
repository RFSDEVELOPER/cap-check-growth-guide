import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminPage, Box, Empty, Field, Pill } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { adminCouponsQuery, adminProductsQuery, dateBR, parseMoney, type CouponRow } from "@/lib/admin-queries";
import { formatPrice, hasActivePromo } from "@/lib/catalog";
import { couponProblem, type Coupon } from "@/lib/checkout";

export const Route = createFileRoute("/_authenticated/admin/promocoes")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminCouponsQuery),
      context.queryClient.ensureQueryData(adminProductsQuery),
    ]),
  component: Promocoes,
});

type Kind = Coupon["kind"];
const KIND_LABEL: Record<Kind, string> = {
  percent: "Desconto em %",
  fixed: "Desconto em R$",
  frete: "Frete grátis",
};

const describe = (c: CouponRow) =>
  c.kind === "percent"
    ? `${Number(c.value)}% de desconto`
    : c.kind === "fixed"
      ? `${formatPrice(Number(c.value))} de desconto`
      : "Frete grátis";

function Promocoes() {
  const { data: coupons } = useSuspenseQuery(adminCouponsQuery);
  const { data: products } = useSuspenseQuery(adminProductsQuery);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CouponRow | "new" | null>(null);

  const onSale = products.filter((p) =>
    hasActivePromo({ price: Number(p.price), promoPrice: p.promo_price == null ? null : Number(p.promo_price), promoUntil: p.promo_until }),
  );

  return (
    <AdminPage
      title="Promoções e cupons"
      description="Crie cupons de desconto ou frete grátis. Promoções de preço por produto são feitas na tela de produtos."
      actions={
        <Button variant="pill" onClick={() => setEditing("new")}>
          <Plus /> Novo cupom
        </Button>
      }
    >
      <Box title="Cupons">
        {coupons.length === 0 ? (
          <Empty>Nenhum cupom criado. Ex.: BEMVINDO10 para 10% na primeira compra.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {coupons.map((c) => {
              const problem = couponProblem(
                {
                  ...c,
                  kind: c.kind as Kind,
                  value: Number(c.value),
                  min_order: 0,
                },
                0,
              );
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                  <div>
                    <p className="flex flex-wrap items-center gap-2">
                      <strong className="font-mono text-base">{c.code}</strong>
                      <Pill tone={problem ? "neutral" : "good"}>{problem ?? "Ativo"}</Pill>
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      {describe(c)}
                      {Number(c.min_order) > 0 && ` · compras acima de ${formatPrice(Number(c.min_order))}`}
                      {c.ends_at && ` · até ${dateBR(c.ends_at)}`}
                      {` · usado ${c.used_count}${c.max_uses ? `/${c.max_uses}` : ""} vezes`}
                    </p>
                    {c.description && <p className="text-muted-foreground">{c.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Editar ${c.code}`} onClick={() => setEditing(c)}>
                    <Pencil />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Box>

      <Box
        title="Produtos em promoção"
        className="mt-6"
        action={
          <Link to="/admin/produtos" className="text-sm text-primary">
            Editar preços
          </Link>
        }
      >
        {onSale.length === 0 ? (
          <Empty>Nenhum produto com preço promocional agora.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {onSale.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>{p.name}</span>
                <span>
                  <strong>{formatPrice(Number(p.promo_price))}</strong>{" "}
                  <s className="text-muted-foreground">{formatPrice(Number(p.price))}</s>
                  {p.promo_until && <span className="text-muted-foreground"> · até {dateBR(p.promo_until)}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Box>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-background sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing === "new" ? "Novo cupom" : "Editar cupom"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <CouponForm
              coupon={editing === "new" ? null : editing}
              onDone={() => {
                setEditing(null);
                queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

const toDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function CouponForm({ coupon, onDone }: { coupon: CouponRow | null; onDone: () => void }) {
  const [kind, setKind] = useState<Kind>((coupon?.kind as Kind) ?? "percent");
  const [active, setActive] = useState(coupon?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const code = s("code").toUpperCase();
    const value = kind === "frete" ? 0 : parseMoney(s("value"));
    const maxUses = s("max_uses") ? Math.floor(Number(s("max_uses"))) : null;

    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) { setError("Código com 3 a 30 letras ou números, sem espaços."); return; }
    if (kind !== "frete" && (!value || value <= 0)) { setError("Informe o valor do desconto."); return; }
    if (kind === "percent" && value! > 100) { setError("Percentual máximo é 100%."); return; }
    if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 1)) { setError("Limite de usos inválido."); return; }

    const values = {
      code,
      description: s("description") || null,
      kind,
      value: value ?? 0,
      min_order: parseMoney(s("min_order")) ?? 0,
      starts_at: s("starts_at") ? new Date(`${s("starts_at")}T00:00:00-03:00`).toISOString() : null,
      ends_at: s("ends_at") ? new Date(`${s("ends_at")}T23:59:59-03:00`).toISOString() : null,
      max_uses: maxUses,
      active,
    };
    setError(null);
    setBusy(true);
    const { error: dbError } = coupon
      ? await supabase.from("coupons").update(values).eq("id", coupon.id)
      : await supabase.from("coupons").insert(values);
    setBusy(false);
    if (dbError) { setError(dbError.code === "23505" ? "Já existe um cupom com esse código." : "Não foi possível salvar."); return; }
    toast.success("Cupom salvo");
    onDone();
  }

  async function remove() {
    if (!coupon || !confirm(`Excluir o cupom ${coupon.code}?`)) return;
    const { error: dbError } = await supabase.from("coupons").delete().eq("id", coupon.id);
    if (dbError) { toast.error("Não foi possível excluir."); return; }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" htmlFor="code">
          <Input id="code" name="code" defaultValue={coupon?.code} maxLength={30} className="h-11 rounded-xl font-mono uppercase" />
        </Field>
        <Field label="Tipo">
          <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {kind !== "frete" && (
          <Field label={kind === "percent" ? "Desconto (%)" : "Desconto (R$)"} htmlFor="value">
            <Input id="value" name="value" inputMode="decimal" defaultValue={coupon ? String(coupon.value).replace(".", ",") : ""} className="h-11 rounded-xl" />
          </Field>
        )}
        <Field label="Compra mínima (R$)" htmlFor="min_order" hint="Vazio = sem mínimo">
          <Input id="min_order" name="min_order" inputMode="decimal" defaultValue={coupon && Number(coupon.min_order) > 0 ? String(coupon.min_order).replace(".", ",") : ""} className="h-11 rounded-xl" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Começa em" htmlFor="starts_at">
          <Input id="starts_at" name="starts_at" type="date" defaultValue={toDate(coupon?.starts_at ?? null)} className="h-11 rounded-xl" />
        </Field>
        <Field label="Termina em" htmlFor="ends_at">
          <Input id="ends_at" name="ends_at" type="date" defaultValue={toDate(coupon?.ends_at ?? null)} className="h-11 rounded-xl" />
        </Field>
        <Field label="Limite de usos" htmlFor="max_uses">
          <Input id="max_uses" name="max_uses" type="number" min={1} defaultValue={coupon?.max_uses ?? ""} className="h-11 rounded-xl" />
        </Field>
      </div>
      <Field label="Anotação (só para você)" htmlFor="description">
        <Input id="description" name="description" defaultValue={coupon?.description ?? ""} maxLength={120} className="h-11 rounded-xl" />
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={active} onCheckedChange={setActive} /> Cupom ativo
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        {coupon ? (
          <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>
            <Trash2 /> Excluir
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="pill" size="xl" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Salvar cupom
        </Button>
      </div>
    </form>
  );
}
