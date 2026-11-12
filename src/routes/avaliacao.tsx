import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PENDING_QUIZ_KEY } from "@/lib/safe-redirect";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { PlanCard } from "@/components/site/PlanCard";
import { ProductCard } from "@/components/site/ProductCard";
import { Logo } from "@/components/site/SiteHeader";
import { cn } from "@/lib/utils";
import { QUIZ, recommendPlan, type QuizAnswers } from "@/lib/catalog";
import { storefrontQuery, useStorefront } from "@/lib/storefront";

export const Route = createFileRoute("/avaliacao")({
  loader: ({ context }) => context.queryClient.ensureQueryData(storefrontQuery),
  head: () => ({
    meta: [
      { title: "Questionário de rotina capilar — Cia Cap" },
      {
        name: "description",
        content:
          "Responda 6 perguntas sobre sua rotina e conheça opções de cuidados capilares sem prescrição. Não substitui uma avaliação de saúde.",
      },
      { property: "og:title", content: "Questionário de rotina capilar — Cia Cap" },
      {
        property: "og:description",
        content:
          "6 perguntas para conhecer suas preferências e explorar produtos para sua rotina capilar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Avaliacao,
});

function Avaliacao() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const done = step >= QUIZ.length;
  const question = QUIZ[step];

  // Ignore extra taps while the next question is on its way, otherwise a double tap skips one.
  const advancing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const choose = (value: string) => {
    if (!question || advancing.current) return;
    advancing.current = true;
    setAnswers((a) => ({ ...a, [question.id]: value }));
    timer.current = setTimeout(() => {
      advancing.current = false;
      setStep((s) => s + 1);
    }, 220);
  };

  const restart = () => {
    clearTimeout(timer.current);
    advancing.current = false;
    setAnswers({});
    setStep(0);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="container-site flex h-16 items-center justify-between">
        <Logo />
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          Sair
        </Link>
      </header>

      {!done && question ? (
        <main className="container-site flex flex-1 flex-col pb-16 pt-4 md:max-w-2xl">
          <div className="flex items-center gap-4">
            <span className="eyebrow shrink-0 text-muted-foreground">
              {step + 1} de {QUIZ.length}
            </span>
            <Progress value={((step + 1) / QUIZ.length) * 100} className="h-1.5 bg-secondary" />
          </div>

          <div key={question.id} className="mt-12 animate-rise">
            <h1 className="text-3xl leading-tight md:text-5xl">{question.title}</h1>
            {question.hint && <p className="mt-3 text-muted-foreground">{question.hint}</p>}

            <div className="mt-10 grid gap-3">
              {question.options.map((opt) => {
                const selected = answers[question.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => choose(opt.value)}
                    className={cn(
                      "flex min-h-16 items-center justify-between rounded-2xl border px-5 py-4 text-left text-base transition-all",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/40 hover:bg-secondary",
                    )}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full border",
                        selected ? "border-primary-foreground" : "border-border",
                      )}
                    >
                      {selected && <Check className="size-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-10">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)} className="-ml-3">
                <ArrowLeft /> Voltar
              </Button>
            )}
          </div>
        </main>
      ) : (
        <Result answers={answers} onRestart={restart} />
      )}
    </div>
  );
}

/**
 * Offers to save the quiz result. The answers are health information (LGPD, sensitive data), so
 * nothing is stored, in the database or in this browser, until the person ticks the consent box.
 */
function SaveResult({ answers }: { answers: QuizAnswers }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [consent, setConsent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const buildRow = () => {
    const result = recommendPlan(answers);
    return {
      answers,
      plan: result.plan,
      score: result.score,
      needs_dermatologist: result.needsDermatologist,
    };
  };

  async function saveToAccount() {
    if (!consent || !user) return;
    setBusy(true);
    const { error } = await supabase
      .from("quiz_results")
      .insert({ ...buildRow(), user_id: user.id });
    setBusy(false);
    if (error) toast.error("Não foi possível salvar agora. Tente novamente.");
    else setSaved(true);
  }

  function createAccountAndSave() {
    if (!consent) return;
    try {
      localStorage.setItem(PENDING_QUIZ_KEY, JSON.stringify(buildRow()));
    } catch {
      /* storage blocked: the person can still create the account and redo the quiz */
    }
    navigate({ to: "/auth", search: { redirect: "/conta" } });
  }

  if (!ready) return null;
  if (saved) {
    return (
      <p className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 text-sm text-primary">
        <Check className="size-4" /> Resultado salvo na sua conta
      </p>
    );
  }

  return (
    <div className="mx-auto mt-8 grid max-w-2xl gap-4 rounded-2xl bg-secondary/70 p-5 text-sm">
      <p>
        {user
          ? "Quer guardar este resultado na sua conta para consultar depois?"
          : "Crie sua conta para salvar suas respostas e consultar suas preferências de cuidados capilares."}
      </p>
      <label className="flex cursor-pointer items-start gap-3 text-left">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5"
        />
        <span className="leading-relaxed text-muted-foreground">
          Autorizo a Cia Cap a guardar as minhas respostas, que são informações sobre a saúde do meu
          cabelo, na minha conta. Posso excluí-las quando quiser. Veja a{" "}
          <Link to="/privacidade" className="text-copper underline">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      <div>
        {user ? (
          <Button variant="pill" onClick={saveToAccount} disabled={!consent || busy}>
            Salvar na minha conta
          </Button>
        ) : (
          <Button variant="pill" onClick={createAccountAndSave} disabled={!consent}>
            Criar conta e salvar
          </Button>
        )}
      </div>
    </div>
  );
}

function Result({ answers, onRestart }: { answers: QuizAnswers; onRestart: () => void }) {
  const { plans, affiliates: PRODUCTS } = useStorefront();
  const result = recommendPlan(answers);
  const noPlan = result.plan === "nenhum";
  const plan = noPlan
    ? undefined
    : (plans.find((p) => p.id === result.plan) ?? plans.find((p) => p.highlight) ?? plans[0]);
  const products = noPlan
    ? []
    : PRODUCTS.filter((p) =>
        result.plan === "essencial" ? p.category === "limpeza" : p.category !== "finalizacao",
      ).slice(0, 3);

  return (
    <main className="container-site animate-rise pb-20 pt-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="eyebrow rounded-full bg-sage px-3 py-1.5 text-sage-foreground">
          Sua rotina capilar
        </span>
        <h1 className="mt-6 text-4xl leading-tight md:text-5xl">
          {noPlan ? (
            <>
              Seu caso merece{" "}
              <em className="font-light italic text-copper">avaliação profissional</em>
            </>
          ) : (
            <>
              Uma opção de rotina: plano{" "}
              <em className="font-light italic text-copper">{plan?.name ?? result.plan}</em>
            </>
          )}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{result.summary}</p>
      </div>

      <SaveResult answers={answers} />

      {result.needsDermatologist && (
        <div className="mx-auto mt-8 flex max-w-2xl gap-3 rounded-2xl border border-copper/40 bg-copper/10 p-5 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-copper" />
          <p>
            Falhas repentinas ou queda muito rápida merecem avaliação por um profissional de saúde.
            Não oferecemos consultas nem receitas; os produtos não substituem esse cuidado.
          </p>
        </div>
      )}

      <div className="mx-auto mt-12 max-w-md">
        {plan && <PlanCard plan={plan} recommended productCopy />}
      </div>

      <p className="mx-auto mt-6 max-w-md text-center text-xs text-muted-foreground">
        Sugestão de rotina, não diagnóstico ou prescrição. Confira o rótulo e as restrições de cada
        produto. Não há garantia de resultados.
      </p>

      {products.length > 0 && (
        <section className="mt-20">
          <h2 className="text-center text-3xl">Produtos para conhecer</h2>
          <div className="mx-auto mt-8 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 text-center">
        <Button variant="ghost" onClick={onRestart}>
          <RotateCcw /> Refazer questionário
        </Button>
        <Button asChild variant="link">
          <Link to="/loja">
            Ver loja completa <ArrowRight />
          </Link>
        </Button>
      </div>
    </main>
  );
}
