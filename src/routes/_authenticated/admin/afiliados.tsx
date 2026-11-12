import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminPage, Empty, Field, Pill } from "@/components/admin/AdminUI";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  adminAffiliatesQuery,
  slugify,
  uploadProductImage,
  type AffiliateRow,
} from "@/lib/admin-queries";
import {
  AFFILIATE_STORES,
  CATEGORY_LABEL,
  fallbackImage,
  type AffiliateStore,
  type ProductCategory,
} from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/afiliados")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminAffiliatesQuery),
  component: Afiliados,
});

type Row = AffiliateRow & { image: string };

function Afiliados() {
  const { data: items } = useSuspenseQuery(adminAffiliatesQuery);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] });
    queryClient.invalidateQueries({ queryKey: ["storefront"] });
  };
  const missing = items.filter((i) => i.url === "#" || !i.url).length;

  return (
    <AdminPage
      title="Links de afiliado"
      description="Produtos indicados no Mercado Livre e no TikTok Shop. Cole aqui o seu link de afiliado de cada um."
      actions={
        <Button variant="pill" onClick={() => setEditing("new")}>
          <Plus /> Novo item
        </Button>
      }
    >
      {missing > 0 && (
        <p className="mb-4 rounded-2xl bg-copper/10 p-4 text-sm text-copper">
          {missing} {missing === 1 ? "item ainda está" : "itens ainda estão"} sem link. Edite e cole
          o link de afiliado.
        </p>
      )}
      {items.length === 0 ? (
        <Empty>Nenhum item cadastrado.</Empty>
      ) : (
        <ul className="grid gap-3">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4"
            >
              <img
                src={p.image}
                alt=""
                className="size-14 shrink-0 rounded-2xl bg-sage object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {p.name}
                  {!p.active && <Pill>Oculto</Pill>}
                  {(p.url === "#" || !p.url) && <Pill tone="warn">Sem link</Pill>}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {p.store} · {CATEGORY_LABEL[p.category as ProductCategory]}
                  {p.url !== "#" && ` · ${p.url}`}
                </p>
              </div>
              {p.url !== "#" && (
                <Button asChild variant="ghost" size="icon" aria-label="Abrir link">
                  <a href={p.url} target="_blank" rel="noopener noreferrer sponsored">
                    <ExternalLink />
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Editar ${p.name}`}
                onClick={() => setEditing(p)}
              >
                <Pencil />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-background sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing === "new" ? "Novo item" : "Editar item"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <AffiliateForm
              item={editing === "new" ? null : editing}
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

function AffiliateForm({ item, onDone }: { item: Row | null; onDone: () => void }) {
  const [category, setCategory] = useState<ProductCategory>(
    (item?.category as ProductCategory) ?? "tratamento",
  );
  const [store, setStore] = useState<AffiliateStore>(
    (item?.store as AffiliateStore) ?? "Mercado Livre",
  );
  const [active, setActive] = useState(item?.active ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const name = s("name");
    const url = s("url") || "#";
    if (name.length < 2) {
      setError("Informe o nome.");
      return;
    }
    if (url !== "#" && !/^https:\/\/[^\s]+$/i.test(url)) {
      setError("O link precisa começar com https://");
      return;
    }
    const id = item?.id ?? slugify(name);
    setError(null);
    setBusy(true);
    try {
      let image_url = item?.image_url ?? null;
      if (file) image_url = await uploadProductImage(`afiliados/${id}`, file);
      const values = {
        name,
        description: s("description"),
        category,
        store,
        url,
        badge: s("badge") || null,
        sort_order: Math.floor(Number(s("sort_order") || "0")) || 0,
        active,
        image_url,
      };
      const { error: dbError } = item
        ? await supabase.from("affiliate_products").update(values).eq("id", item.id)
        : await supabase.from("affiliate_products").insert({ id, ...values });
      if (dbError) {
        setError(
          dbError.code === "23505"
            ? "Já existe um item com esse nome."
            : "Não foi possível salvar.",
        );
        setBusy(false);
        return;
      }
      toast.success("Item salvo");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
    setBusy(false);
  }

  async function remove() {
    if (!item || !confirm(`Excluir "${item.name}"?`)) return;
    const { error: dbError } = await supabase.from("affiliate_products").delete().eq("id", item.id);
    if (dbError) {
      toast.error("Não foi possível excluir.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="flex items-start gap-4">
        <ImagePicker current={item?.image ?? fallbackImage("", category)} onFile={setFile} />
        <div className="grid flex-1 gap-4">
          <Field label="Nome" htmlFor="name">
            <Input
              id="name"
              name="name"
              defaultValue={item?.name}
              maxLength={100}
              className="h-11 rounded-xl"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Loja">
              <Select value={store} onValueChange={(v) => setStore(v as AffiliateStore)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AFFILIATE_STORES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
      </div>
      <Field
        label="Link de afiliado"
        htmlFor="url"
        hint="Copie o link gerado no painel de afiliados da loja."
      >
        <Input
          id="url"
          name="url"
          type="url"
          defaultValue={item?.url === "#" ? "" : item?.url}
          placeholder="https://"
          className="h-11 rounded-xl"
        />
      </Field>
      <Field label="Descrição" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          defaultValue={item?.description}
          maxLength={300}
          className="rounded-xl"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Selo (opcional)" htmlFor="badge">
          <Input
            id="badge"
            name="badge"
            defaultValue={item?.badge ?? ""}
            maxLength={30}
            className="h-11 rounded-xl"
          />
        </Field>
        <Field label="Ordem" htmlFor="sort_order">
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={item?.sort_order ?? 0}
            className="h-11 rounded-xl"
          />
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={active} onCheckedChange={setActive} /> Mostrar no site
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        {item ? (
          <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>
            <Trash2 /> Excluir
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="pill" size="xl" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Salvar
        </Button>
      </div>
    </form>
  );
}
