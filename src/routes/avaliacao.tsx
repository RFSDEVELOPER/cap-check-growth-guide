import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlanCard } from "@/components/site/PlanCard";
import { ProductCard } from "@/components/site/ProductCard";
import { Logo } from "@/components/site/SiteHeader";
import { cn } from "@/lib/utils";
import { getPlan, PRODUCTS, QUIZ, recommendPlan, type QuizAnswers } from "@/lib/catalog";

export const Route = createFileRoute("/avaliacao")({
  head: () => ({
    meta: [
      { title: "Avaliação capilar gratuita — Cia Cap" },
      {
        name: "description",
        content: "Responda 6 perguntas rápidas e descubra o plano de tratamento capilar indicado para o seu caso.",
      },
      { property: "og:title", content: "Avaliação capilar gratuita — Cia Cap" },
      {
        property: "og:description",
        content: "6 perguntas, 3 minutos e uma indicação de plano feita para o seu tipo de queda.",
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

  const choose = (value: string) => {
    if (!question) return;
    setAnswers((a) => ({ ...a, [question.id]: value }));
    setTimeout(() => setStep((s) => s + 1), 220);
  };

  const restart = () => {
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

function Result({ answers, onRestart }: { answers: QuizAnswers; onRestart: () => void }) {
  const result = recommendPlan(answers);
  const plan = getPlan(result.plan);
  const products = PRODUCTS.filter((p) =>
    result.plan === "essencial" ? p.category === "limpeza" : p.category !== "finalizacao",
  ).slice(0, 3);

  return (
    <main className="container-site animate-rise pb-20 pt-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="eyebrow rounded-full bg-sage px-3 py-1.5 text-sage-foreground">
          Seu resultado
        </span>
        <h1 className="mt-6 text-4xl leading-tight md:text-5xl">
          Indicamos o plano <em className="font-light italic text-copper">{plan.name}</em>
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{result.summary}</p>
      </div>

      {result.needsDermatologist && (
        <div className="mx-auto mt-8 flex max-w-2xl gap-3 rounded-2xl border border-copper/40 bg-copper/10 p-5 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-copper" />
          <p>
            Esse tipo de queda merece uma conversa com dermatologista. O plano Avançado já inclui
            essa consulta.
          </p>
        </div>
      )}

      <div className="mx-auto mt-12 max-w-md">
        <PlanCard plan={plan} recommended />
      </div>

      <p className="mx-auto mt-6 max-w-md text-center text-xs text-muted-foreground">
        Esta é uma indicação inicial. O tratamento final é definido pelo médico na consulta.
      </p>

      <section className="mt-20">
        <h2 className="text-center text-3xl">Combina com o seu plano</h2>
        <div className="mx-auto mt-8 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <div className="mt-12 text-center">
        <Button variant="ghost" onClick={onRestart}>
          <RotateCcw /> Refazer avaliação
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
