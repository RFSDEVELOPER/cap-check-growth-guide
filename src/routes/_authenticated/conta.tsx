import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, Loader2, LogOut, Package, Repeat } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatBRL } from "@/lib/catalog";
import { storefrontQuery, useStorefront } from "@/lib/storefront";
import { useCart } from "@/lib/cart";
import { FULFILLMENT_LABEL, STATUS_LABEL, type FulfillmentStatus, type OrderLine } from "@/lib/checkout";
import { syncMyPayments } from "@/lib/payments.functions";
import { PENDING_QUIZ_KEY } from "@/lib/safe-redirect";
import { cn } from "@/lib/utils";

const accountQuery = queryOptions({
  queryKey: ["account"],
  queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) throw new Error("Sessão expirada");
    const [profile, quiz, orders, subs] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("quiz_results").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(5),
    ]);
    return {
      email: auth.user?.email ?? "",
      profile: profile.data,
      quiz: quiz.data ?? [],
      orders: orders.data ?? [],
      subscriptions: subs.data ?? [],
    };
  },
});

export const Route = createFileRoute("/_authenticated/conta")({
  validateSearch: (s: Record<string, unknown>): { pedido?: string; assinatura?: string } => ({
    ...(typeof s["pedido"] === "string" ? { pedido: s["pedido"] } : {}),
    ...(typeof s["assinatura"] === "string" ? { assinatura: s["assinatura"] } : {}),
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(accountQuery),
      context.queryClient.ensureQueryData(storefrontQuery),
    ]),
  head: () => ({
    meta: [
      { title: "Minha conta — Cia Cap" },
      { name: "description", content: "Seus dados, avaliações, pedidos e assinatura Cia Cap." },
      { property: "og:title", content: "Minha conta — Cia Cap" },
      { property: "og:description", content: "Área do paciente Cia Cap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Conta,
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(100),
  phone: z.string().trim().regex(/^[\d\s()+-]{10,20}$/, "Telefone inválido"),
  cep: z.string().trim().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  street: z.string().trim().min(2, "Informe a rua").max(150),
  number: z.string().trim().min(1, "Informe o número").max(20),
  complement: z.string().trim().max(80).optional().or(z.literal("")),
  neighborhood: z.string().trim().min(2, "Informe o bairro").max(80),
  city: z.string().trim().min(2, "Informe a cidade").max(80),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/, "UF com 2 letras"),
});

const dateBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function Conta() {
  const { data } = useSuspenseQuery(accountQuery);
  const { plans } = useStorefront();
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;
  const { pedido, assinatura } = Route.useSearch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const sync = useServerFn(syncMyPayments);
  const cart = useCart();
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    // Save a questionnaire answered before signing in.
    const pending = localStorage.getItem(PENDING_QUIZ_KEY);
    if (pending) {
      localStorage.removeItem(PENDING_QUIZ_KEY);
      (async () => {
        try {
          const parsed = JSON.parse(pending);
          const { data: auth } = await supabase.auth.getUser();
          if (!auth.user) return;
          const { error } = await supabase.from("quiz_results").insert({ ...parsed, user_id: auth.user.id });
          if (!error) {
            toast.success("Sua avaliação foi salva na conta");
            queryClient.invalidateQueries({ queryKey: ["account"] });
          }
        } catch {
          /* ignore */
        }
      })();
    }

    if (pedido) {
      cart.clear();
      toast.success("Pedido recebido! O status atualiza assim que o pagamento for confirmado.");
    }
    if (assinatura) toast.success("Assinatura enviada ao Mercado Pago. Acompanhe o status abaixo.");

    sync()
      .then((r) => {
        if (r.synced > 0) queryClient.invalidateQueries({ queryKey: ["account"] });
      })
      .catch(() => undefined);
  }, [pedido, assinatura, cart, queryClient, sync]);

  const activeSub = data.subscriptions.find((s) => s.status === "ativa") ?? data.subscriptions[0];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-site pb-20 pt-10 md:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow text-copper">Área do paciente</span>
            <h1 className="mt-2 text-4xl md:text-5xl">
              Olá{data.profile?.full_name ? `, ${data.profile.full_name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-1 text-muted-foreground">{data.email}</p>
          </div>
          <Button
            variant="pill-outline"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut /> Sair
          </Button>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <ProfileForm profile={data.profile} />

          <div className="grid content-start gap-6">
            <Panel icon={Repeat} title="Minha assinatura">
              {activeSub ? (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl">
                      Plano {planName(activeSub.plan_id)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatBRL(Number(activeSub.amount))}/mês · desde {dateBR(activeSub.created_at)}
                    </p>
                  </div>
                  <StatusPill status={activeSub.status} />
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground">Você ainda não tem um plano.</p>
                  <Button asChild variant="pill" className="mt-4">
                    <a href="/#planos">Ver planos</a>
                  </Button>
                </div>
              )}
            </Panel>

            <Panel icon={ClipboardList} title="Minhas avaliações">
              {data.quiz.length ? (
                <ul className="divide-y divide-border">
                  {data.quiz.map((q) => (
                    <li key={q.id} className="flex items-center justify-between py-3 text-sm">
                      <span>
                        Indicação: <strong>{planName(q.plan)}</strong>
                        {q.needs_dermatologist && (
                          <span className="ml-2 text-copper">· recomenda dermatologista</span>
                        )}
                      </span>
                      <span className="text-muted-foreground">{dateBR(q.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div>
                  <p className="text-muted-foreground">Nenhuma avaliação salva ainda.</p>
                  <Button asChild variant="pill-outline" className="mt-4">
                    <Link to="/avaliacao">Fazer avaliação</Link>
                  </Button>
                </div>
              )}
            </Panel>
          </div>
        </div>

        <div className="mt-6">
          <Panel icon={Package} title="Meus pedidos">
            {data.orders.length ? (
              <ul className="divide-y divide-border">
                {data.orders.map((o) => {
                  const items = (o.items as unknown as OrderLine[]) ?? [];
                  return (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div className="text-sm">
                        <p className="font-medium">
                          {items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                        </p>
                        <p className="text-muted-foreground">
                          {dateBR(o.created_at)} · {formatBRL(Number(o.total))}
                          {Number(o.discount) > 0 && ` · cupom ${o.coupon_code}`}
                        </p>
                        {o.status === "pago" && (
                          <p className="mt-1 text-muted-foreground">
                            Entrega:{" "}
                            <strong className="text-foreground">
                              {FULFILLMENT_LABEL[o.fulfillment_status as FulfillmentStatus] ?? o.fulfillment_status}
                            </strong>
                            {o.estimated_delivery && o.fulfillment_status !== "entregue" &&
                              ` · previsão ${new Date(`${o.estimated_delivery}T12:00:00`).toLocaleDateString("pt-BR")}`}
                            {o.tracking_code && (
                              <>
                                {" · rastreio "}
                                <span className="font-mono text-foreground">{o.tracking_code}</span>
                                {o.carrier ? ` (${o.carrier})` : ""}
                              </>
                            )}
                          </p>
                        )}
                        {o.customer_note && <p className="mt-1 text-copper">{o.customer_note}</p>}
                      </div>
                      <StatusPill status={o.status} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div>
                <p className="text-muted-foreground">Nenhum pedido ainda.</p>
                <Button asChild variant="pill-outline" className="mt-4">
                  <Link to="/loja">Ir para a loja</Link>
                </Button>
              </div>
            )}
          </Panel>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Package;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 md:p-7">
      <h2 className="flex items-center gap-2 text-xl">
        <Icon className="size-5 text-primary" /> {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const good = status === "pago" || status === "ativa";
  const bad = ["recusado", "cancelado", "cancelada"].includes(status);
  return (
    <span
      className={cn(
        "eyebrow shrink-0 rounded-full px-3 py-1",
        good && "bg-primary text-primary-foreground",
        bad && "bg-destructive/15 text-destructive",
        !good && !bad && "bg-secondary text-secondary-foreground",
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

type Profile = Tables<"profiles">;

function ProfileForm({ profile }: { profile: Profile | null }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  async function lookupCep(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8 || !formRef.current) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const json = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (json.erro) return;
      const f = formRef.current.elements;
      const set = (name: string, v?: string) => {
        const el = f.namedItem(name) as HTMLInputElement | null;
        if (el && v && !el.value) el.value = v;
      };
      set("street", json.logradouro);
      set("neighborhood", json.bairro);
      set("city", json.localidade);
      set("state", json.uf);
    } catch {
      /* CEP lookup is a convenience only */
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget).entries());
    const parsed = profileSchema.safeParse(raw);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setBusy(false);
    const { error } = await supabase.from("profiles").upsert({
      id: auth.user.id,
      email: auth.user.email ?? null,
      ...parsed.data,
      state: parsed.data.state.toUpperCase(),
      complement: parsed.data.complement || null,
    });
    setBusy(false);
    if (error) return toast.error("Não foi possível salvar. Tente de novo.");
    toast.success("Dados salvos");
    queryClient.invalidateQueries({ queryKey: ["account"] });
  }

  const v = (k: keyof Profile) => (profile?.[k] as string | null) ?? "";

  return (
    <section id="endereco" className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 md:p-7">
      <h2 className="text-xl">Meus dados e endereço de entrega</h2>
      <form ref={formRef} onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-6" noValidate>
        <F name="full_name" label="Nome completo" def={v("full_name")} err={errors["full_name"]} span="sm:col-span-6" autoComplete="name" />
        <F name="phone" label="Telefone (WhatsApp)" def={v("phone")} err={errors["phone"]} span="sm:col-span-3" type="tel" autoComplete="tel" />
        <F
          name="cep"
          label="CEP"
          def={v("cep")}
          err={errors["cep"]}
          span="sm:col-span-3"
          inputMode="numeric"
          autoComplete="postal-code"
          onBlur={(e) => lookupCep(e.currentTarget.value)}
        />
        <F name="street" label="Rua" def={v("street")} err={errors["street"]} span="sm:col-span-4" autoComplete="address-line1" />
        <F name="number" label="Número" def={v("number")} err={errors["number"]} span="sm:col-span-2" />
        <F name="complement" label="Complemento" def={v("complement")} err={errors["complement"]} span="sm:col-span-3" />
        <F name="neighborhood" label="Bairro" def={v("neighborhood")} err={errors["neighborhood"]} span="sm:col-span-3" />
        <F name="city" label="Cidade" def={v("city")} err={errors["city"]} span="sm:col-span-4" autoComplete="address-level2" />
        <F name="state" label="UF" def={v("state")} err={errors["state"]} span="sm:col-span-2" maxLength={2} autoComplete="address-level1" />
        <div className="sm:col-span-6">
          <Button type="submit" variant="pill" size="xl" disabled={busy} className="w-full sm:w-auto">
            {busy && <Loader2 className="animate-spin" />} Salvar dados
          </Button>
        </div>
      </form>
    </section>
  );
}

function F({
  name,
  label,
  def,
  err,
  span,
  ...props
}: {
  name: string;
  label: string;
  def: string;
  err?: string | undefined;
  span: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("grid gap-1.5", span)}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={def} className="h-11 rounded-xl" aria-invalid={!!err} {...props} />
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
