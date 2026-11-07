import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { formatBRL, getShopProduct, SHIPPING_FEE } from "@/lib/catalog";
import { startCartCheckout } from "@/lib/payments.functions";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Loja Cia Cap" },
      { name: "description", content: "Revise seus produtos Cia Cap e pague com Mercado Pago." },
      { property: "og:title", content: "Carrinho — Loja Cia Cap" },
      { property: "og:description", content: "Finalize sua compra com Mercado Pago: Pix, cartão ou boleto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Carrinho,
});

const formatPrice = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Carrinho() {
  const cart = useCart();
  const { user, ready } = useAuth();
  const checkout = useServerFn(startCartCheckout);
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      const res = await checkout({ data: { items: cart.lines, origin: window.location.origin } });
      if ("url" in res) {
        window.location.href = res.url;
        return;
      }
      if (res.error === "endereco_incompleto") {
        toast.error("Complete seu endereço de entrega antes de pagar.", {
          action: { label: "Completar", onClick: () => (window.location.href = "/conta#endereco") },
        });
      } else if (res.error === "pagamento_indisponivel") {
        toast.error("O pagamento ainda está sendo ativado. Tente novamente em breve.");
      } else {
        toast.error("Não conseguimos abrir o pagamento. Tente de novo.");
      }
    } catch {
      toast.error("Não conseguimos abrir o pagamento. Tente de novo.");
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-site pb-20 pt-10 md:pt-14">
        <h1 className="text-4xl md:text-5xl">Seu carrinho</h1>

        {cart.lines.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border p-12 text-center">
            <ShoppingBag className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Seu carrinho está vazio.</p>
            <Button asChild variant="pill" size="xl" className="mt-6">
              <Link to="/loja">Ver produtos</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <ul className="grid content-start gap-4">
              {cart.lines.map((line) => {
                const p = getShopProduct(line.id);
                if (!p) return null;
                return (
                  <li key={line.id} className="flex gap-4 rounded-3xl border border-border bg-card p-4">
                    <img src={p.image} alt={p.name} className="size-24 shrink-0 rounded-2xl bg-sage object-cover" />
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between gap-3">
                        <h2 className="text-lg leading-tight">{p.name}</h2>
                        <button
                          type="button"
                          onClick={() => cart.remove(p.id)}
                          aria-label={`Remover ${p.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatPrice(p.price)} cada</p>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex items-center rounded-full border border-border">
                          <button
                            type="button"
                            className="grid size-9 place-items-center"
                            aria-label="Diminuir"
                            onClick={() => cart.setQty(p.id, line.qty - 1)}
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="w-8 text-center font-mono text-sm">{line.qty}</span>
                          <button
                            type="button"
                            className="grid size-9 place-items-center"
                            aria-label="Aumentar"
                            onClick={() => cart.setQty(p.id, line.qty + 1)}
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                        <span className="font-medium">{formatPrice(p.price * line.qty)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="h-fit rounded-3xl bg-secondary/70 p-6 lg:sticky lg:top-24">
              <h2 className="text-2xl">Resumo</h2>
              <dl className="mt-5 grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Produtos</dt>
                  <dd>{formatPrice(cart.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Frete</dt>
                  <dd>{SHIPPING_FEE === 0 ? "Grátis" : formatPrice(SHIPPING_FEE)}</dd>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-medium">
                  <dt>Total</dt>
                  <dd>{formatBRL(cart.total) === formatPrice(cart.total) ? formatBRL(cart.total) : formatPrice(cart.total)}</dd>
                </div>
              </dl>

              {ready && !user ? (
                <Button asChild variant="pill" size="xl" className="mt-6 w-full">
                  <Link to="/auth" search={{ redirect: "/carrinho" }}>
                    Entrar para finalizar
                  </Link>
                </Button>
              ) : (
                <Button variant="pill" size="xl" className="mt-6 w-full" disabled={busy || !ready} onClick={pay}>
                  {busy ? <Loader2 className="animate-spin" /> : <Lock />} Pagar com Mercado Pago
                </Button>
              )}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Pix, cartão de crédito ou boleto, em ambiente seguro do Mercado Pago.
              </p>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
