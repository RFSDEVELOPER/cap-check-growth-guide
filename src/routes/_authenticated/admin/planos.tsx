import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Info, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminPage, Field, Pill } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  adminPlansQuery,
  adminSubscriptionsQuery,
  parseMoney,
  type PlanRow,
} from "@/lib/admin-queries";

export const Route = createFileRoute("/_authenticated/admin/planos")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminPlansQuery),
      context.queryClient.ensureQueryData(adminSubscriptionsQuery),
    ]),
  component: Planos,
});

function Planos() {
  const { data: plans } = useSuspenseQuery(adminPlansQuery);
  const { data: subs } = useSuspenseQuery(adminSubscriptionsQuery);

  return (
    <AdminPage
      title="Planos"
      description="Edite nome, preço mensal, descrição e o que vem incluso em cada plano."
    >
      <div className="mb-6 flex gap-3 rounded-2xl bg-secondary/70 p-4 text-sm text-muted-foreground">
        <Info className="size-5 shrink-0 text-primary" />
        <p>
          Um novo preço vale para as próximas assinaturas. Quem já assina continua pagando o valor
          combinado no Mercado Pago.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        {plans.map((p) => (
          <PlanForm
            key={p.id}
            plan={p}
            activeCount={subs.filter((s) => s.plan_id === p.id && s.status === "ativa").length}
          />
        ))}
      </div>
    </AdminPage>
  );
}

function PlanForm({ plan, activeCount }: { plan: PlanRow; activeCount: number }) {
  const queryClient = useQueryClient();
  const [highlight, setHighlight] = useState(plan.highlight);
  const [active, setActive] = useState(plan.active);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const price = parseMoney(s("price"));
    if (s("name").length < 2) {
      toast.error("Informe o nome do plano.");
      return;
    }
    if (!price || price <= 0) {
      toast.error("Informe um preço válido.");
      return;
    }
    const features = s("features")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 10);

    setBusy(true);
    if (highlight && !plan.highlight) {
      // Only one plan is shown as "Mais escolhido".
      await supabase.from("plans").update({ highlight: false }).neq("id", plan.id);
    }
    const { error } = await supabase
      .from("plans")
      .update({ name: s("name"), price, tagline: s("tagline"), features, highlight, active })
      .eq("id", plan.id);
    setBusy(false);
    if (error) {
      toast.error("Não foi possível salvar o plano.");
      return;
    }
    toast.success(`Plano ${s("name")} salvo`);
    queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
    queryClient.invalidateQueries({ queryKey: ["storefront"] });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid content-start gap-4 rounded-3xl border border-border bg-card p-6"
      noValidate
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow text-copper">{plan.id}</span>
        <Pill tone={activeCount ? "good" : "neutral"}>{activeCount} assinantes</Pill>
      </div>
      <Field label="Nome" htmlFor={`name-${plan.id}`}>
        <Input
          id={`name-${plan.id}`}
          name="name"
          defaultValue={plan.name}
          maxLength={40}
          className="h-11 rounded-xl"
        />
      </Field>
      <Field label="Preço por mês (R$)" htmlFor={`price-${plan.id}`}>
        <Input
          id={`price-${plan.id}`}
          name="price"
          inputMode="decimal"
          defaultValue={String(plan.price).replace(".", ",")}
          className="h-11 rounded-xl font-mono"
        />
      </Field>
      <Field label="Frase curta" htmlFor={`tagline-${plan.id}`}>
        <Input
          id={`tagline-${plan.id}`}
          name="tagline"
          defaultValue={plan.tagline}
          maxLength={80}
          className="h-11 rounded-xl"
        />
      </Field>
      <Field label="O que inclui" htmlFor={`features-${plan.id}`} hint="Um item por linha.">
        <Textarea
          id={`features-${plan.id}`}
          name="features"
          defaultValue={plan.features.join("\n")}
          rows={5}
          className="rounded-xl"
        />
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={highlight} onCheckedChange={setHighlight} /> Destacar como “Mais escolhido”
      </label>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={active} onCheckedChange={setActive} /> Disponível para assinar
      </label>
      <Button type="submit" variant="pill" size="xl" disabled={busy}>
        {busy && <Loader2 className="animate-spin" />} Salvar plano
      </Button>
    </form>
  );
}
