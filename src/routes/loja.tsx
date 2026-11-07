import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Info, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/site/ProductCard";
import { ShopProductCard } from "@/components/site/ShopProductCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, PRODUCTS, SHOP_PRODUCTS, type ProductCategory } from "@/lib/catalog";

export const Route = createFileRoute("/loja")({
  head: () => ({
    meta: [
      { title: "Loja Cia Cap — Produtos para queda de cabelo" },
      {
        name: "description",
        content: "Minoxidil, shampoos, tônicos e suplementos selecionados para complementar seu tratamento capilar.",
      },
      { property: "og:title", content: "Loja Cia Cap — Produtos para queda de cabelo" },
      {
        property: "og:description",
        content: "Produtos selecionados de lojas parceiras para completar sua rotina capilar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Loja,
});

type Filter = "todos" | ProductCategory;

function Loja() {
  const [filter, setFilter] = useState<Filter>("todos");
  const filters: Filter[] = ["todos", ...(Object.keys(CATEGORY_LABEL) as ProductCategory[])];
  const list = filter === "todos" ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-site pb-20 pt-12 md:pt-16">
        <span className="eyebrow text-copper">Loja Cia Cap</span>
        <h1 className="mt-3 max-w-2xl text-4xl leading-tight md:text-6xl">
          Produtos que completam o tratamento
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Produtos da marca Cia Cap e itens selecionados de lojas parceiras para a rotina de quem
          trata a queda.
        </p>

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl">Produtos Cia Cap</h2>
              <p className="mt-1 text-muted-foreground">
                Compre aqui mesmo e pague com Pix, cartão ou boleto pelo Mercado Pago.
              </p>
            </div>
            <Button asChild variant="pill-outline">
              <Link to="/carrinho">
                <ShoppingBag /> Ver carrinho
              </Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SHOP_PRODUCTS.map((p) => (
              <ShopProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        <h2 className="mt-20 text-3xl">Indicados nas lojas parceiras</h2>
        <p className="mt-1 text-muted-foreground">
          Itens que recomendamos no Mercado Livre e no TikTok Shop.
        </p>
        <div className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-secondary",
              )}
            >
              {f === "todos" ? "Todos" : CATEGORY_LABEL[f]}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        <div className="mt-10 flex gap-3 rounded-2xl bg-secondary/70 p-5 text-sm text-muted-foreground">
          <Info className="size-5 shrink-0 text-primary" />
          <p>
            Alguns links são de afiliados: podemos receber uma comissão quando você compra, sem custo
            extra. Produtos não substituem a avaliação médica.
          </p>
        </div>

        <div className="mt-16 rounded-[2rem] bg-forest-glow p-8 text-forest-foreground md:flex md:items-center md:justify-between md:p-12">
          <div>
            <h2 className="text-3xl">Não sabe por onde começar?</h2>
            <p className="mt-2 text-forest-foreground/75">
              A avaliação gratuita indica o plano e os produtos certos para você.
            </p>
          </div>
          <Button asChild variant="on-forest" size="xl" className="mt-6 md:mt-0">
            <Link to="/avaliacao">
              Fazer avaliação <ArrowRight />
            </Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
