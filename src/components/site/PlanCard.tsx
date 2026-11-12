import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { SubscribeButton } from "@/components/site/SubscribeButton";
import { cn } from "@/lib/utils";
import { formatBRL, type Plan } from "@/lib/catalog";

export function PlanCard({
  plan,
  recommended,
  productCopy = false,
}: {
  plan: Plan;
  recommended?: boolean;
  productCopy?: boolean;
}) {
  const featured = recommended ?? plan.highlight;
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-3xl border p-7",
        featured
          ? "border-transparent bg-forest-glow text-forest-foreground shadow-lift"
          : "border-border bg-card",
      )}
    >
      {featured && (
        <span className="eyebrow absolute -top-3 left-7 rounded-full bg-copper px-3 py-1 text-copper-foreground">
          {recommended
            ? productCopy
              ? "Sugestão de rotina"
              : "Indicado para você"
            : productCopy
              ? "Em destaque"
              : "Mais escolhido"}
        </span>
      )}
      <h3 className="text-2xl">{plan.name}</h3>
      <p
        className={cn(
          "mt-1 text-sm",
          featured ? "text-forest-foreground/75" : "text-muted-foreground",
        )}
      >
        {productCopy ? "Cuidados capilares sem prescrição" : plan.tagline}
      </p>
      <p className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-5xl tracking-tight">{formatBRL(plan.price)}</span>
        <span
          className={cn(
            "text-sm",
            featured ? "text-forest-foreground/70" : "text-muted-foreground",
          )}
        >
          /mês
        </span>
      </p>
      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {productCopy ? (
          <li className="text-sm leading-relaxed">
            Confira os produtos, itens inclusos e condições deste plano antes de assinar. Sem
            consultas ou receitas médicas.
          </li>
        ) : (
          plan.features.map((f) => (
            <li key={f} className="flex gap-3">
              <Check
                className={cn("mt-0.5 size-4 shrink-0", featured ? "text-copper" : "text-primary")}
              />
              <span>{f}</span>
            </li>
          ))
        )}
      </ul>
      <SubscribeButton
        planId={plan.id}
        label={`Assinar o ${plan.name}`}
        variant={featured ? "copper" : "pill"}
        size="xl"
        className="mt-8 w-full"
      />
      {!recommended && (
        <Link
          to="/avaliacao"
          className={cn(
            "mt-3 text-center text-sm underline-offset-4 hover:underline",
            featured ? "text-forest-foreground/80" : "text-muted-foreground",
          )}
        >
          Não sabe qual? Responda ao questionário
        </Link>
      )}
    </article>
  );
}
