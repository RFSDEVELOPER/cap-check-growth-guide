import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminPage, Empty, Field, Pill } from "@/components/admin/AdminUI";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  adminProductsQuery,
  adminSettingsQuery,
  parseMoney,
  slugify,
  uploadProductImage,
  type ProductRow,
} from "@/lib/admin-queries";
import { CATEGORY_LABEL, fallbackImage, formatPrice, hasActivePromo, type ProductCategory } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminProductsQuery),
      context.queryClient.ensureQueryData(adminSettingsQuery),
    ]),
  component: Produtos,
});

type Row = ProductRow & { image: string };

const promoOf = (p: ProductRow) => ({
  price: Number(p.price),
  promoPrice: p.promo_price == null ? null : Number(p.promo_price),
  promoUntil: p.promo_until,
});

function Produtos() {
  const { data: products } = useSuspenseQuery(adminProductsQuery);
  const { data: settings } = useSuspenseQuery(adminSettingsQuery);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const low = settings?.low_stock_alert ?? 5;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    queryClient.invalidateQueries({ queryKey: ["storefront"] });
  };

  async function patch(id: string, values: Partial<ProductRow>) {
    const { error } = await supabase.from("products").update(values).eq("id", id);
    if (error) toast.error("Não foi possível salvar.");
    else refresh();
  }

  return (
    <AdminPage
      title="Produtos e estoque"
      description="Cadastre os produtos da loja própria, ajuste preço, promoção, estoque e prazo de entrega."
      actions={
        <Button variant="pill" onClick={() => setEditing("new")}>
          <Plus /> Novo produto
        </Button>
      }
    >
      {products.length === 0 ? (
        <Empty>Nenhum produto cadastrado.</Empty>
      ) : (
        <ul className="grid gap-3">
          {products.map((p) => {
            const promo = hasActivePromo(promoOf(p));
            return (
              <li
                key={p.id}
                className="grid items-center gap-4 rounded-3xl border border-border bg-card p-4 sm:grid-cols-[auto_1fr_auto]"
              >
                <img src={p.image} alt="" className="size-16 rounded-2xl bg-sage object-cover" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{p.name}</p>
                    {!p.active && <Pill>Oculto</Pill>}
                    {promo && <Pill tone="warn">Promoção</Pill>}
                    {p.stock === 0 ? <Pill tone="bad">Esgotado</Pill> : p.stock <= low && <Pill tone="warn">Estoque baixo</Pill>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {CATEGORY_LABEL[p.category as ProductCategory]} ·{" "}
                    {promo ? (
                      <>
                        <strong className="text-foreground">{formatPrice(Number(p.promo_price))}</strong>{" "}
                        <s>{formatPrice(Number(p.price))}</s>
                      </>
                    ) : (
                      <strong className="text-foreground">{formatPrice(Number(p.price))}</strong>
                    )}{" "}
                    · entrega em {p.delivery_days} dias
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StockEditor product={p} onSave={(stock) => patch(p.id, { stock })} />
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch checked={p.active} onCheckedChange={(v) => patch(p.id, { active: v })} aria-label="Visível na loja" />
                    Na loja
                  </label>
                  <Button variant="ghost" size="icon" aria-label={`Editar ${p.name}`} onClick={() => setEditing(p)}>
                    <Pencil />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-background sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing === "new" ? "Novo produto" : "Editar produto"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <ProductForm
              product={editing === "new" ? null : editing}
              onDone={() => {
                setEditing(null);
                refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

function StockEditor({ product, onSave }: { product: ProductRow; onSave: (stock: number) => void }) {
  const [value, setValue] = useState(String(product.stock));
  const changed = value !== String(product.stock);
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Math.max(0, Math.floor(Number(value)));
        if (Number.isFinite(n)) onSave(n);
      }}
    >
      <label className="text-sm text-muted-foreground" htmlFor={`stock-${product.id}`}>
        Estoque
      </label>
      <Input
        id={`stock-${product.id}`}
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-20 rounded-xl text-center font-mono"
      />
      {changed && (
        <Button type="submit" size="sm" variant="pill">
          OK
        </Button>
      )}
    </form>
  );
}

function ProductForm({ product, onDone }: { product: Row | null; onDone: () => void }) {
  const [category, setCategory] = useState<ProductCategory>((product?.category as ProductCategory) ?? "tratamento");
  const [active, setActive] = useState(product?.active ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const name = s("name");
    const price = parseMoney(s("price"));
    const promoPrice = parseMoney(s("promo_price"));
    const stock = Math.floor(Number(s("stock") || "0"));
    const deliveryDays = Math.floor(Number(s("delivery_days") || "7"));
    const promoUntil = s("promo_until");

    if (name.length < 2) return setError("Informe o nome do produto.");
    if (!price || price <= 0) return setError("Informe um preço válido.");
    if (promoPrice != null && promoPrice >= price) return setError("O preço promocional precisa ser menor que o preço normal.");
    if (!Number.isFinite(stock) || stock < 0) return setError("Estoque inválido.");
    if (!Number.isFinite(deliveryDays) || deliveryDays < 1 || deliveryDays > 90)
      return setError("Prazo de entrega entre 1 e 90 dias.");

    const id = product?.id ?? slugify(name);
    if (id.length < 2) return setError("Nome inválido.");
    setError(null);
    setBusy(true);
    try {
      let image_url = product?.image_url ?? null;
      if (file) image_url = await uploadProductImage(`produtos/${id}`, file);
      const values = {
        name,
        description: s("description"),
        category,
        price,
        promo_price: promoPrice,
        promo_until: promoPrice != null && promoUntil ? new Date(`${promoUntil}T23:59:59-03:00`).toISOString() : null,
        stock,
        delivery_days: deliveryDays,
        badge: s("badge") || null,
        sort_order: Math.floor(Number(s("sort_order") || "0")) || 0,
        active,
        image_url,
      };
      const { error: dbError } = product
        ? await supabase.from("products").update(values).eq("id", product.id)
        : await supabase.from("products").insert({ id, ...values });
      if (dbError) {
        setError(dbError.code === "23505" ? "Já existe um produto com esse nome." : "Não foi possível salvar.");
        setBusy(false);
        return;
      }
      toast.success("Produto salvo");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
    setBusy(false);
  }

  async function remove() {
    if (!product || !confirm(`Excluir "${product.name}"? Pedidos antigos continuam guardados.`)) return;
    const { error: dbError } = await supabase.from("products").delete().eq("id", product.id);
    if (dbError) return toast.error("Não foi possível excluir.");
    toast.success("Produto excluído");
    onDone();
  }

  const promoDate = product?.promo_until ? product.promo_until.slice(0, 10) : "";

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="flex items-start gap-4">
        <ImagePicker current={product?.image ?? fallbackImage("", category)} onFile={setFile} />
        <div className="grid flex-1 gap-4">
          <Field label="Nome" htmlFor="name">
            <Input id="name" name="name" defaultValue={product?.name} maxLength={100} className="h-11 rounded-xl" required />
          </Field>
          <Field label="Categoria">
            <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABEL) as ProductCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
      <Field label="Descrição" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={product?.description} maxLength={400} className="rounded-xl" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Preço (R$)" htmlFor="price">
          <Input id="price" name="price" inputMode="decimal" defaultValue={product ? String(product.price).replace(".", ",") : ""} className="h-11 rounded-xl" />
        </Field>
        <Field label="Estoque (unidades)" htmlFor="stock">
          <Input id="stock" name="stock" type="number" min={0} defaultValue={product?.stock ?? 0} className="h-11 rounded-xl" />
        </Field>
        <Field label="Prazo de entrega (dias)" htmlFor="delivery_days">
          <Input id="delivery_days" name="delivery_days" type="number" min={1} max={90} defaultValue={product?.delivery_days ?? 7} className="h-11 rounded-xl" />
        </Field>
      </div>
      <div className="grid gap-4 rounded-2xl bg-copper/10 p-4 sm:grid-cols-2">
        <Field label="Preço promocional (R$)" htmlFor="promo_price" hint="Deixe vazio para sem promoção.">
          <Input
            id="promo_price"
            name="promo_price"
            inputMode="decimal"
            defaultValue={product?.promo_price != null ? String(product.promo_price).replace(".", ",") : ""}
            className="h-11 rounded-xl bg-card"
          />
        </Field>
        <Field label="Promoção vale até" htmlFor="promo_until" hint="Vazio = sem data para acabar.">
          <Input id="promo_until" name="promo_until" type="date" defaultValue={promoDate} className="h-11 rounded-xl bg-card" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Selo (opcional)" htmlFor="badge" hint='Ex.: "Mais vendido", "Novo"'>
          <Input id="badge" name="badge" defaultValue={product?.badge ?? ""} maxLength={30} className="h-11 rounded-xl" />
        </Field>
        <Field label="Ordem na loja" htmlFor="sort_order" hint="Números menores aparecem primeiro.">
          <Input id="sort_order" name="sort_order" type="number" defaultValue={product?.sort_order ?? 0} className="h-11 rounded-xl" />
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={active} onCheckedChange={setActive} /> Mostrar na loja
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {product ? (
          <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>
            <Trash2 /> Excluir
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="pill" size="xl" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Salvar produto
        </Button>
      </div>
    </form>
  );
}
