import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminPage, Box, Field } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { adminSettingsQuery, parseMoney } from "@/lib/admin-queries";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminSettingsQuery),
  component: Configuracoes,
});

const money = (v: number | string | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

function Configuracoes() {
  const { data: settings } = useSuspenseQuery(adminSettingsQuery);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const shipping = parseMoney(s("shipping_fee")) ?? 0;
    const freeMin = parseMoney(s("free_shipping_min"));
    const low = Math.floor(Number(s("low_stock_alert") || "5"));
    if (shipping < 0 || (freeMin != null && freeMin < 0) || !Number.isFinite(low) || low < 0)
      { toast.error("Confira os valores."); return; }
    setBusy(true);
    const { error } = await supabase
      .from("store_settings")
      .update({ shipping_fee: shipping, free_shipping_min: freeMin, low_stock_alert: low })
      .eq("id", true);
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar."); return; }
    toast.success("Configurações salvas");
    queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    queryClient.invalidateQueries({ queryKey: ["storefront"] });
  }

  return (
    <AdminPage title="Frete e loja" description="Valor do frete, frete grátis e alerta de estoque.">
      <Box className="max-w-xl">
        <form onSubmit={onSubmit} className="grid gap-5" noValidate>
          <Field label="Frete fixo por pedido (R$)" htmlFor="shipping_fee" hint="Use 0 para frete sempre grátis.">
            <Input id="shipping_fee" name="shipping_fee" inputMode="decimal" defaultValue={money(settings?.shipping_fee ?? 0)} className="h-11 rounded-xl font-mono" />
          </Field>
          <Field
            label="Frete grátis a partir de (R$)"
            htmlFor="free_shipping_min"
            hint="Compras com valor igual ou acima não pagam frete. Vazio = desligado."
          >
            <Input id="free_shipping_min" name="free_shipping_min" inputMode="decimal" defaultValue={money(settings?.free_shipping_min)} className="h-11 rounded-xl font-mono" />
          </Field>
          <Field label="Avisar estoque baixo com (unidades)" htmlFor="low_stock_alert" hint="Produtos com essa quantidade ou menos aparecem em alerta.">
            <Input id="low_stock_alert" name="low_stock_alert" type="number" min={0} defaultValue={settings?.low_stock_alert ?? 5} className="h-11 rounded-xl font-mono" />
          </Field>
          <Button type="submit" variant="pill" size="xl" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </form>
      </Box>
      <p className="mt-4 max-w-xl text-sm text-muted-foreground">
        O prazo de entrega é definido em cada produto. No pedido vale o maior prazo entre os itens, e você
        pode ajustar a data em Pedidos e entregas.
      </p>
    </AdminPage>
  );
}
