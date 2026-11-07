import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, type AffiliateProduct } from "@/lib/catalog";

export function ProductCard({ product }: { product: AffiliateProduct }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:shadow-lift">
      <div className="relative aspect-square overflow-hidden bg-sage">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={816}
          height={816}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {product.badge && (
          <span className="eyebrow absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-foreground">
            {product.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="eyebrow text-copper">{CATEGORY_LABEL[product.category]}</span>
        <h3 className="mt-2 text-xl leading-tight">{product.name}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </p>
        <Button asChild variant="pill-outline" className="mt-5 h-11 w-full">
          <a href={product.url} target="_blank" rel="sponsored noopener noreferrer">
            Ver no {product.store} <ArrowUpRight />
          </a>
        </Button>
      </div>
    </article>
  );
}
