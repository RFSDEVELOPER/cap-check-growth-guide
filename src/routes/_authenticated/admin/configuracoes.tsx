import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminPage, Box, Field, Pill } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { adminSettingsQuery, parseMoney } from "@/lib/admin-queries";
import { getSecretHints, saveSecrets } from "@/lib/settings.functions";

const paymentSettingsQuery = queryOptions({
  queryKey: ["admin", "payment-settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("payment_settings").select("*").maybeSingle();
    if (error) throw error;
    return data;
  },
});

const hintsQuery = queryOptions({
  queryKey: ["admin", "secret-hints"],
  queryFn: () => getSecretHints(),
});

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminSettingsQuery),
      context.queryClient.ensureQueryData(paymentSettingsQuery),
      context.queryClient.ensureQueryData(hintsQuery),
    ]),
  head: () => ({ meta: [
    { title: "Configurações de pagamentos e frete — Admin Cia Cap" },
    { name: "description", content: "Configurações de pagamentos e frete na administração da Cia Cap." },
    { property: "og:title", content: "Configurações de pagamentos e frete — Admin Cia Cap" },
    { property: "og:description", content: "Configurações de pagamentos e frete na administração da Cia Cap." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Configuracoes,
});

const money = (v: number | string | null | undefined) => (v == null ? "" : String(v).replace(".", ","));
type SecretName = "mp_access_token_teste" | "mp_access_token_producao" | "mp_webhook_secret" | "melhorenvio_token";

function SecretInput({ id, label, hint, last4 }: { id: SecretName; label: string; hint?: string | undefined; last4?: string | undefined }) {
  return (
    <Field label={label} htmlFor={id} {...(hint ? { hint } : {})}>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          name={id}
          type="password"
          autoComplete="off"
          placeholder={last4 ? `Salva: •••• ${last4} — digite para trocar` : "Não configurada"}
          className="h-11 rounded-xl font-mono"
        />
        {last4 ? <Pill tone="good">•••• {last4}</Pill> : <Pill>Vazia</Pill>}
      </div>
    </Field>
  );
}

function useSecretSaver() {
  const save = useServerFn(saveSecrets);
  const queryClient = useQueryClient();
  return async (f: FormData, names: SecretName[]) => {
    const values = names
      .map((name) => ({ name, value: String(f.get(name) ?? "").trim() }))
      .filter((v) => v.value);
    if (values.some((v) => v.value.length < 8)) throw new Error("Chave muito curta.");
    if (values.length === 0) return;
    const hints = await save({ data: { values, remove: [] } });
    queryClient.setQueryData(hintsQuery.queryKey, hints);
  };
}

function Configuracoes() {
  return (
    <AdminPage title="Configurações" description="Pagamentos e frete da loja.">
      <Tabs defaultValue="pagamentos" className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="frete">Frete</TabsTrigger>
        </TabsList>
        <TabsContent value="pagamentos" className="mt-6">
          <Pagamentos />
        </TabsContent>
        <TabsContent value="frete" className="mt-6">
          <Frete />
        </TabsContent>
      </Tabs>
    </AdminPage>
  );
}

function Pagamentos() {
  const { data: pay } = useSuspenseQuery(paymentSettingsQuery);
  const { data: hints } = useSuspenseQuery(hintsQuery);
  const queryClient = useQueryClient();
  const saveSecretsFrom = useSecretSaver();
  const [production, setProduction] = useState(pay?.mode === "producao");
  const [busy, setBusy] = useState(false);
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/mercadopago/webhook` : "";
  const mode = production ? "producao" : "teste";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    try {
      const { error } = await supabase
        .from("payment_settings")
        .update({
          gateway: "mercadopago",
          mode,
          public_key_teste: String(f.get("public_key_teste") ?? "").trim() || null,
          public_key_producao: String(f.get("public_key_producao") ?? "").trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", true);
      if (error) throw error;
      await saveSecretsFrom(f, ["mp_access_token_teste", "mp_access_token_producao", "mp_webhook_secret"]);
      form.reset();
      queryClient.invalidateQueries({ queryKey: paymentSettingsQuery.queryKey });
      toast.success("Pagamentos salvos");
    } catch (err) {
      toast.error(err instanceof Error && err.message.startsWith("Chave") ? err.message : "Não foi possível salvar.");
    }
    setBusy(false);
  }

  return (
    <Box>
      <form onSubmit={onSubmit} className="grid gap-5" noValidate>
        <Field label="Meio de pagamento">
          <Select value="mercadopago" disabled>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="mercadopago">Mercado Pago</SelectItem></SelectContent>
          </Select>
        </Field>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4">
          <span>
            <span className="font-medium">{production ? "Modo produção" : "Modo teste"}</span>
            <span className="block text-xs text-muted-foreground">
              {production ? "Cobranças reais nos clientes." : "Use as credenciais de teste; nenhum valor é cobrado."}
            </span>
          </span>
          <Switch checked={production} onCheckedChange={setProduction} aria-label="Modo produção" />
        </label>

        <div className="grid gap-4 rounded-2xl bg-secondary/50 p-4">
          <p className="eyebrow text-muted-foreground">Credenciais de teste</p>
          <Field label="Chave pública (Public Key)" htmlFor="public_key_teste">
            <Input id="public_key_teste" name="public_key_teste" defaultValue={pay?.public_key_teste ?? ""} placeholder="TEST-..." className="h-11 rounded-xl font-mono" />
          </Field>
          <SecretInput id="mp_access_token_teste" label="Chave secreta (Access Token)" last4={hints.mp_access_token_teste} />
        </div>
        <div className="grid gap-4 rounded-2xl bg-secondary/50 p-4">
          <p className="eyebrow text-muted-foreground">Credenciais de produção</p>
          <Field label="Chave pública (Public Key)" htmlFor="public_key_producao">
            <Input id="public_key_producao" name="public_key_producao" defaultValue={pay?.public_key_producao ?? ""} placeholder="APP_USR-..." className="h-11 rounded-xl font-mono" />
          </Field>
          <SecretInput id="mp_access_token_producao" label="Chave secreta (Access Token)" last4={hints.mp_access_token_producao} />
        </div>

        <SecretInput
          id="mp_webhook_secret"
          label="Assinatura secreta do webhook"
          hint="No Mercado Pago: Suas integrações → Webhooks. Cole lá o endereço abaixo e o evento “Pagamentos”."
          last4={hints.mp_webhook_secret}
        />
        <div className="flex items-center gap-2">
          <Input readOnly value={webhookUrl} aria-label="Endereço do webhook" className="h-10 rounded-xl font-mono text-xs" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Copiar endereço"
            onClick={() => navigator.clipboard.writeText(webhookUrl).then(() => toast.success("Copiado"))}
          >
            <Copy />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          As chaves secretas ficam guardadas criptografadas no servidor e nunca voltam para o navegador — aqui só aparecem os
          4 últimos caracteres.
        </p>
        <Button type="submit" variant="pill" size="xl" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Salvar pagamentos
        </Button>
      </form>
    </Box>
  );
}

function Frete() {
  const { data: settings } = useSuspenseQuery(adminSettingsQuery);
  const { data: hints } = useSuspenseQuery(hintsQuery);
  const queryClient = useQueryClient();
  const saveSecretsFrom = useSecretSaver();
  const [sandbox, setSandbox] = useState(settings?.shipping_sandbox ?? false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const shipping = parseMoney(s("shipping_fee")) ?? 0;
    const freeMin = parseMoney(s("free_shipping_min"));
    const low = Math.floor(Number(s("low_stock_alert") || "5"));
    const handling = Math.floor(Number(s("handling_days") || "0"));
    const cep = s("origin_cep").replace(/\D/g, "");
    if (shipping < 0 || (freeMin != null && freeMin < 0) || !Number.isFinite(low) || low < 0)
      { toast.error("Confira os valores."); return; }
    if (!Number.isFinite(handling) || handling < 0 || handling > 60) { toast.error("Prazo de manuseio entre 0 e 60 dias."); return; }
    if (cep && cep.length !== 8) { toast.error("CEP de origem com 8 números."); return; }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("store_settings")
        .update({
          shipping_fee: shipping,
          free_shipping_min: freeMin,
          low_stock_alert: low,
          handling_days: handling,
          origin_cep: cep || null,
          shipping_sandbox: sandbox,
        })
        .eq("id", true);
      if (error) throw error;
      await saveSecretsFrom(f, ["melhorenvio_token"]);
      form.reset();
      toast.success("Frete salvo");
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
    } catch (err) {
      toast.error(err instanceof Error && err.message.startsWith("Chave") ? err.message : "Não foi possível salvar.");
    }
    setBusy(false);
  }

  return (
    <Box>
      <form onSubmit={onSubmit} className="grid gap-5" noValidate>
        <p className="text-sm text-muted-foreground">
          O frete por CEP usa Correios e Jadlog pela plataforma Melhor Envio. Sem token, vale o frete fixo abaixo.
        </p>
        <SecretInput
          id="melhorenvio_token"
          label="Token do Melhor Envio"
          hint="Melhor Envio → Configurações → Tokens → Novo token (permissão de cálculo de frete)."
          last4={hints.melhorenvio_token}
        />
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={sandbox} onCheckedChange={setSandbox} /> Token de teste (sandbox do Melhor Envio)
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CEP de origem" htmlFor="origin_cep" hint="De onde os pedidos saem.">
            <Input id="origin_cep" name="origin_cep" inputMode="numeric" defaultValue={settings?.origin_cep ?? ""} placeholder="00000-000" className="h-11 rounded-xl font-mono" />
          </Field>
          <Field label="Prazo de manuseio (dias)" htmlFor="handling_days" hint="Somado ao prazo da transportadora.">
            <Input id="handling_days" name="handling_days" type="number" min={0} max={60} defaultValue={settings?.handling_days ?? 0} className="h-11 rounded-xl font-mono" />
          </Field>
          <Field label="Frete grátis a partir de (R$)" htmlFor="free_shipping_min" hint="Vazio = desligado.">
            <Input id="free_shipping_min" name="free_shipping_min" inputMode="decimal" defaultValue={money(settings?.free_shipping_min)} className="h-11 rounded-xl font-mono" />
          </Field>
          <Field label="Frete fixo sem cotação (R$)" htmlFor="shipping_fee" hint="Usado enquanto o Melhor Envio não estiver ligado.">
            <Input id="shipping_fee" name="shipping_fee" inputMode="decimal" defaultValue={money(settings?.shipping_fee ?? 0)} className="h-11 rounded-xl font-mono" />
          </Field>
          <Field label="Avisar estoque baixo com (unidades)" htmlFor="low_stock_alert">
            <Input id="low_stock_alert" name="low_stock_alert" type="number" min={0} defaultValue={settings?.low_stock_alert ?? 5} className="h-11 rounded-xl font-mono" />
          </Field>
        </div>
        <Button type="submit" variant="pill" size="xl" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Salvar frete
        </Button>
      </form>
    </Box>
  );
}
