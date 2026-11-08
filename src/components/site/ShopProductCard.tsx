import { useNavigate } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { CATEGORY_LABEL, formatPrice, hasActivePromo, type ShopProduct } from "@/lib/catalog";

export function ShopProductCard({ product, lowStockAlert = 5 }: { product: ShopProduct; lowStockAlert?: number }) {
  const cart = useCart();
  const navigate = useNavigate();
  const promo = hasActivePromo(product);
  const soldOut = product.stock <= 0;
  const inCart = cart.lines.find((l) => l.id === product.id)?.qty ?? 0;
  const atLimit = inCart >= product.stock;

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
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {promo && (
            <span className="eyebrow rounded-full bg-copper px-3 py-1 text-copper-foreground">Promoção</span>
          )}
          {product.badge && (
            <span className="eyebrow rounded-full bg-background/90 px-3 py-1 text-foreground">{product.badge}</span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="eyebrow text-copper">{CATEGORY_LABEL[product.category]}</span>
        <h3 className="mt-2 text-xl leading-tight">{product.name}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
        <div className="mt-4 flex items-baseline gap-2">
          <p className="font-display text-3xl tracking-tight">
            {formatPrice(promo ? product.promoPrice! : product.price)}
          </p>
          {promo && <s className="text-sm text-muted-foreground">{formatPrice(product.price)}</s>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {soldOut
            ? "Esgotado no momento"
            : product.stock <= lowStockAlert
              ? `Últimas ${product.stock} unidades · entrega em até ${product.deliveryDays} dias`
              : `Entrega em até ${product.deliveryDays} dias`}
        </p>
        <Button
          variant="pill"
          className="mt-4 h-11 w-full"
          disabled={soldOut || atLimit}
          onClick={() => {
            cart.add(product.id);
            toast.success(`${product.name} no carrinho`, {
              action: { label: "Ver carrinho", onClick: () => navigate({ to: "/carrinho" }) },
            });
          }}
        >
          <ShoppingBag /> {soldOut ? "Esgotado" : atLimit ? "Limite do estoque" : "Adicionar ao carrinho"}
        </Button>
      </div>
    </article>
  );
}
