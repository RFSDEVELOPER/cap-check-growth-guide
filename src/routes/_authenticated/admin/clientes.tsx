import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminPage, Empty, Pill, paymentTone } from "@/components/admin/AdminUI";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  adminCustomersQuery,
  adminOrdersQuery,
  adminPlansQuery,
  adminSubscriptionChargesQuery,
  adminSubscriptionsQuery,
  dateBR,
  type ProfileRow,
} from "@/lib/admin-queries";
import { formatPrice, QUIZ, type QuizAnswers } from "@/lib/catalog";
import { STATUS_LABEL } from "@/lib/checkout";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminCustomersQuery),
      context.queryClient.ensureQueryData(adminOrdersQuery),
      context.queryClient.ensureQueryData(adminSubscriptionsQuery),
      context.queryClient.ensureQueryData(adminSubscriptionChargesQuery),
      context.queryClient.ensureQueryData(adminPlansQuery),
    ]),
  component: Clientes,
});

function Clientes() {
  const { data: customers } = useSuspenseQuery(adminCustomersQuery);
  const { data: orders } = useSuspenseQuery(adminOrdersQuery);
  const { data: subs } = useSuspenseQuery(adminSubscriptionsQuery);
  const { data: plans } = useSuspenseQuery(adminPlansQuery);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;
  const quizPlan = (id: string) =>
    id === "nenhum" ? "sem plano (avaliação profissional)" : planName(id);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return customers.profiles;
    return customers.profiles.filter((p) =>
      [p.full_name, p.email, p.phone, p.city].some((v) => v?.toLowerCase().includes(term)),
    );
  }, [customers.profiles, q]);

  const open = customers.profiles.find((p) => p.id === openId) ?? null;

  return (
    <AdminPage
      title="Clientes"
      description={`${customers.profiles.length} cadastros. Veja contato, endereço, avaliações, pedidos e plano de cada um.`}
    >
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome, e-mail, telefone, cidade"
          className="h-10 rounded-full bg-card pl-9"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        {list.length === 0 ? (
          <div className="p-6">
            <Empty>Nenhum cliente encontrado.</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((p) => {
              const sub = subs.find((s) => s.user_id === p.id && s.status === "ativa");
              const quiz = customers.quiz.find((r) => r.user_id === p.id);
              const paid = orders.filter((o) => o.user_id === p.id && o.status === "pago").length;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(p.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left text-sm hover:bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium">{p.full_name ?? "Sem nome"}</p>
                      <p className="text-muted-foreground">
                        {[p.email, p.phone, p.city && `${p.city}/${p.state}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sub && <Pill tone="good">Plano {planName(sub.plan_id)}</Pill>}
                      {quiz && <Pill>Indicação {quizPlan(quiz.plan)}</Pill>}
                      {quiz?.needs_dermatologist && <Pill tone="warn">Dermatologista</Pill>}
                      {paid > 0 && <Pill>{paid} pedidos</Pill>}
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
          {open && <CustomerDetail profile={open} planName={planName} />}
        </SheetContent>
      </Sheet>
    </AdminPage>
  );
}

function CustomerDetail({
  profile,
  planName,
}: {
  profile: ProfileRow;
  planName: (id: string) => string;
}) {
  const { data: customers } = useSuspenseQuery(adminCustomersQuery);
  const { data: orders } = useSuspenseQuery(adminOrdersQuery);
  const { data: subs } = useSuspenseQuery(adminSubscriptionsQuery);
  const { data: charges } = useSuspenseQuery(adminSubscriptionChargesQuery);
  const quiz = customers.quiz.filter((r) => r.user_id === profile.id);
  const myOrders = orders.filter((o) => o.user_id === profile.id);
  const mySubs = subs.filter((s) => s.user_id === profile.id);
  const mySubIds = new Set(mySubs.map((s) => s.id));
  const myCharges = charges.filter((c) => mySubIds.has(c.subscription_id));

  return (
    <div className="pb-10 text-sm">
      <SheetHeader className="px-0">
        <SheetTitle className="font-display text-2xl">{profile.full_name ?? "Cliente"}</SheetTitle>
      </SheetHeader>
      <p className="text-muted-foreground">Cliente desde {dateBR(profile.created_at)}</p>

      <section className="mt-5 rounded-2xl bg-secondary/60 p-4">
        <h3 className="eyebrow text-muted-foreground">Contato e endereço</h3>
        <p className="mt-2">{profile.email ?? "—"}</p>
        <p>{profile.phone ?? "sem telefone"}</p>
        <p className="mt-2 text-muted-foreground">
          {profile.street ? (
            <>
              {profile.street}, {profile.number}
              {profile.complement ? ` — ${profile.complement}` : ""}
              <br />
              {profile.neighborhood} · {profile.city}/{profile.state} · CEP {profile.cep}
            </>
          ) : (
            "Endereço não preenchido"
          )}
        </p>
      </section>

      <section className="mt-5">
        <h3 className="eyebrow text-muted-foreground">Planos</h3>
        {mySubs.length === 0 ? (
          <p className="mt-2 text-muted-foreground">Nenhuma assinatura.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {mySubs.map((s) => (
              <li key={s.id} className="flex justify-between gap-2">
                <span>
                  {planName(s.plan_id)} · {formatPrice(Number(s.amount))}/mês ·{" "}
                  {dateBR(s.created_at)}
                </span>
                <Pill tone={paymentTone(s.status)}>{STATUS_LABEL[s.status] ?? s.status}</Pill>
              </li>
            ))}
          </ul>
        )}
        {myCharges.length > 0 && (
          <ul className="mt-3 grid gap-1 text-muted-foreground">
            {myCharges.map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span>
                  Cobrança {dateBR(c.paid_at ?? c.created_at)} · {formatPrice(Number(c.amount))}
                </span>
                <Pill tone={paymentTone(c.status)}>{STATUS_LABEL[c.status] ?? c.status}</Pill>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5">
        <h3 className="eyebrow text-muted-foreground">Pedidos</h3>
        {myOrders.length === 0 ? (
          <p className="mt-2 text-muted-foreground">Nenhum pedido.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {myOrders.map((o) => (
              <li key={o.id} className="flex justify-between gap-2">
                <span>
                  #{o.id.slice(0, 8)} · {dateBR(o.created_at)} · {formatPrice(Number(o.total))}
                </span>
                <Pill tone={paymentTone(o.status)}>{STATUS_LABEL[o.status] ?? o.status}</Pill>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5">
        <h3 className="eyebrow text-muted-foreground">Avaliações</h3>
        {quiz.length === 0 ? (
          <p className="mt-2 text-muted-foreground">Nenhuma avaliação salva.</p>
        ) : (
          quiz.map((r) => {
            const answers = (r.answers ?? {}) as QuizAnswers;
            return (
              <div key={r.id} className="mt-3 rounded-2xl border border-border p-4">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {dateBR(r.created_at)} · indicação{" "}
                  {r.plan === "nenhum" ? "sem plano (avaliação profissional)" : planName(r.plan)}
                  {r.needs_dermatologist && (
                    <Pill tone="warn">
                      <AlertTriangle className="mr-1 size-3" /> Dermatologista
                    </Pill>
                  )}
                </p>
                <dl className="mt-2 grid gap-1 text-muted-foreground">
                  {QUIZ.map((question) => (
                    <div key={question.id}>
                      <dt className="text-xs">{question.title}</dt>
                      <dd className="text-foreground">
                        {question.options.find((o) => o.value === answers[question.id])?.label ??
                          "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
