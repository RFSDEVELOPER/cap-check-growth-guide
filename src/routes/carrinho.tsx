import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, Minus, Plus, ShoppingBag, Tag, Trash2, Truck, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { effectivePrice, formatPrice, hasActivePromo } from "@/lib/catalog";
import { buildOrder, CheckoutError, type OrderDraft } from "@/lib/checkout";
import { quoteCart, quoteShippingByCep, startCartCheckout, type CheckoutFailure } from "@/lib/payments.functions";
import { storefrontQuery, useStorefront } from "@/lib/storefront";

export const Route = createFileRoute("/carrinho")({
  loader: ({ context }) => context.queryClient.ensureQueryData(storefrontQuery),
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

function errorText(code: CheckoutFailure | string, detail?: string): string {
  switch (code) {
    case "sem_estoque":
      return `Estoque insuficiente${detail ? ` para ${detail}` : ""}. Diminua a quantidade.`;
    case "produto_indisponivel":
      return "Um produto do carrinho não está mais à venda.";
    case "cupom_invalido":
      return detail ?? "Cupom inválido.";
    case "carrinho_vazio":
      return "Seu carrinho está vazio.";
    case "frete_indisponivel":
      return "Calcule o frete com o CEP do seu endereço de entrega e escolha uma opção.";
    case "pagamento_indisponivel":
      return "O pagamento ainda está sendo ativado. Tente novamente em breve.";
    default:
      return "Não conseguimos abrir o pagamento. Tente de novo.";
  }
}

function Carrinho() {
  const cart = useCart();
  const store = useStorefront();
  const { user, ready } = useAuth();
  const checkout = useServerFn(startCartCheckout);
  const quote = useServerFn(quoteCart);
  const [busy, setBusy] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; order: OrderDraft } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const shipQuote = useServerFn(quoteShippingByCep);
  const [cep, setCep] = useState("");
  const [shipBusy, setShipBusy] = useState(false);
  const [shipOptions, setShipOptions] = useState<{ id: string; name: string; price: number; days: number }[] | null>(null);
  const [shipMode, setShipMode] = useState<"fixo" | "cotacao" | null>(null);
  const [shipId, setShipId] = useState<string | null>(null);
  const picked = shipOptions?.find((o) => o.id === shipId) ?? null;
  const shipParams = picked ? { cep, shippingService: picked.id } : {};

  async function calcShipping(e: FormEvent) {
    e.preventDefault();
    setShipBusy(true);
    try {
      const res = await shipQuote({ data: { cep, items: cart.lines } });
      if ("error" in res) {
        toast.error(res.error === "cep_invalido" ? "Digite um CEP com 8 números." : "Não foi possível calcular o frete agora.");
      } else if (res.mode === "fixo") {
        setShipMode("fixo");
        setShipOptions(null);
      } else {
        setShipMode("cotacao");
        setShipOptions(res.options);
        setShipId(res.options[0]?.id ?? null);
        if (res.options.length === 0) toast.error("Nenhuma entrega disponível para esse CEP.");
      }
    } catch {
      toast.error("Não foi possível calcular o frete agora.");
    }
    setShipBusy(false);
  }

  const local = useMemo((): { order: OrderDraft } | { error: string } | null => {
    if (cart.lines.length === 0) return null;
    try {
      return {
        order: buildOrder(
          cart.lines,
          store,
          null,
          new Date(),
          picked ? { service: picked.name, price: picked.price, days: picked.days } : null,
        ),
      };
    } catch (e) {
      if (e instanceof CheckoutError) return { error: errorText(e.code, e.detail) };
      return { error: errorText("falha") };
    }
  }, [cart.lines, store, picked]);

  // Re-price with the coupon on the server whenever the cart changes.
  const linesKey = JSON.stringify(cart.lines);
  useEffect(() => {
    if (!coupon || cart.lines.length === 0) return;
    let alive = true;
    quote({ data: { items: cart.lines, coupon: coupon.code, ...shipParams } })
      .then((res) => {
        if (!alive) return;
        if ("order" in res) setCoupon({ code: coupon.code, order: res.order });
        else {
          setCoupon(null);
          toast.error(errorText(res.error, res.detail));
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, picked?.id]);

  async function applyCoupon(e: FormEvent) {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    try {
      const res = await quote({ data: { items: cart.lines, coupon: code, ...shipParams } });
      if ("order" in res) {
        setCoupon({ code, order: res.order });
        toast.success("Cupom aplicado");
      } else toast.error(errorText(res.error, res.detail));
    } catch {
      toast.error("Não foi possível validar o cupom.");
    }
    setCouponBusy(false);
  }

  async function pay() {
    setBusy(true);
    try {
      const res = await checkout({
        data: {
          items: cart.lines,
          origin: window.location.origin,
          ...(coupon ? { coupon: coupon.code } : {}),
          ...(picked ? { shippingService: picked.id } : {}),
        },
      });
      if ("url" in res) {
        window.location.href = res.url;
        return;
      }
      if (res.error === "endereco_incompleto") {
        toast.error("Complete seu endereço de entrega antes de pagar.", {
          action: { label: "Completar", onClick: () => (window.location.href = "/conta#endereco") },
        });
      } else {
        toast.error(errorText(res.error, res.detail));
      }
    } catch {
      toast.error(errorText("falha"));
    }
    setBusy(false);
  }

  const order = coupon?.order ?? (local && "order" in local ? local.order : null);
  const problem = local && "error" in local ? local.error : null;
  const { freeShippingMin } = store.settings;
  const missingForFree =
    order && freeShippingMin != null && order.shipping > 0 ? freeShippingMin - (order.subtotal - order.discount) : 0;

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
                const p = cart.getProduct(line.id);
                if (!p) return null;
                const unit = effectivePrice(p);
                const overStock = line.qty > p.stock;
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
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(unit)} cada
                        {hasActivePromo(p) && <s className="ml-2">{formatPrice(p.price)}</s>}
                      </p>
                      {overStock && (
                        <p className="text-xs text-destructive">
                          {p.stock > 0 ? `Só temos ${p.stock} em estoque` : "Esgotado"}
                        </p>
                      )}
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
                            className="grid size-9 place-items-center disabled:opacity-40"
                            aria-label="Aumentar"
                            disabled={line.qty >= p.stock}
                            onClick={() => cart.setQty(p.id, line.qty + 1)}
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                        <span className="font-medium">{formatPrice(unit * line.qty)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="h-fit rounded-3xl bg-secondary/70 p-6 lg:sticky lg:top-24">
              <h2 className="text-2xl">Resumo</h2>

              {user && (
                coupon ? (
                  <div className="mt-5 flex items-center justify-between rounded-xl border border-primary/25 bg-card px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Tag className="size-4 text-copper" /> Cupom <strong className="font-mono">{coupon.code}</strong>
                    </span>
                    <button type="button" aria-label="Remover cupom" onClick={() => setCoupon(null)}>
                      <X className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={applyCoupon} className="mt-5 flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Cupom de desconto"
                      aria-label="Cupom de desconto"
                      maxLength={30}
                      className="h-10 rounded-xl bg-card font-mono uppercase"
                    />
                    <Button type="submit" variant="pill-outline" disabled={couponBusy || !couponInput.trim()}>
                      {couponBusy ? <Loader2 className="animate-spin" /> : "Aplicar"}
                    </Button>
                  </form>
                )
              )}

              <form onSubmit={calcShipping} className="mt-5 flex gap-2">
                <Input
                  value={cep}
                  onChange={(e) => {
                    setCep(e.target.value);
                    setShipOptions(null);
                    setShipId(null);
                    setShipMode(null);
                  }}
                  placeholder="CEP para o frete"
                  aria-label="CEP para calcular o frete"
                  inputMode="numeric"
                  maxLength={9}
                  className="h-10 rounded-xl bg-card font-mono"
                />
                <Button type="submit" variant="pill-outline" disabled={shipBusy || cep.replace(/\D/g, "").length !== 8}>
                  {shipBusy ? <Loader2 className="animate-spin" /> : "Calcular"}
                </Button>
              </form>
              {shipOptions && shipOptions.length > 0 && (
                <fieldset className="mt-3 grid gap-2" aria-label="Opções de entrega">
                  {shipOptions.map((o) => (
                    <label
                      key={o.id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm has-[:checked]:border-primary"
                    >
                      <span className="flex items-center gap-2">
                        <input type="radio" name="frete" checked={shipId === o.id} onChange={() => setShipId(o.id)} className="accent-primary" />
                        <span>
                          {o.name}
                          <span className="block text-xs text-muted-foreground">até {o.days} dias úteis</span>
                        </span>
                      </span>
                      <strong>{formatPrice(o.price)}</strong>
                    </label>
                  ))}
                  <p className="text-xs text-muted-foreground">O valor final usa o CEP do endereço de entrega da sua conta.</p>
                </fieldset>
              )}
              {shipMode === "fixo" && (
                <p className="mt-2 text-xs text-muted-foreground">Frete fixo da loja aplicado.</p>
              )}

              {order && (
                <dl className="mt-5 grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Produtos</dt>
                    <dd>{formatPrice(order.subtotal)}</dd>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-copper">
                      <dt>Desconto</dt>
                      <dd>− {formatPrice(order.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Frete</dt>
                    <dd>{order.shipping === 0 ? "Grátis" : formatPrice(order.shipping)}</dd>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-medium">
                    <dt>Total</dt>
                    <dd>{formatPrice(order.total)}</dd>
                  </div>
                </dl>
              )}
              {order && (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="size-4" /> Entrega em até {order.deliveryDays} dias após o pagamento
                </p>
              )}
              {missingForFree > 0 && (
                <p className="mt-2 text-xs text-primary">
                  Faltam {formatPrice(missingForFree)} para ganhar frete grátis.
                </p>
              )}
              {problem && <p className="mt-4 text-sm text-destructive">{problem}</p>}

              {ready && !user ? (
                <Button asChild variant="pill" size="xl" className="mt-6 w-full">
                  <Link to="/auth" search={{ redirect: "/carrinho" }}>
                    Entrar para finalizar
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="pill"
                  size="xl"
                  className="mt-6 w-full"
                  disabled={busy || !ready || !!problem}
                  onClick={pay}
                >
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
