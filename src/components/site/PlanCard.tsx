import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL, type Plan } from "@/lib/catalog";

export function PlanCard({ plan, recommended }: { plan: Plan; recommended?: boolean }) {
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
          {recommended ? "Indicado para você" : "Mais escolhido"}
        </span>
      )}
      <h3 className="text-2xl">{plan.name}</h3>
      <p className={cn("mt-1 text-sm", featured ? "text-forest-foreground/75" : "text-muted-foreground")}>
        {plan.tagline}
      </p>
      <p className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-5xl tracking-tight">{formatBRL(plan.price)}</span>
        <span className={cn("text-sm", featured ? "text-forest-foreground/70" : "text-muted-foreground")}>
          /mês
        </span>
      </p>
      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-3">
            <Check className={cn("mt-0.5 size-4 shrink-0", featured ? "text-copper" : "text-primary")} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button asChild variant={featured ? "copper" : "pill"} size="xl" className="mt-8 w-full">
        <Link to="/avaliacao">Começar pela avaliação</Link>
      </Button>
    </article>
  );
}
