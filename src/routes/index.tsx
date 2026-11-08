import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Package,
  RefreshCw,
  ShieldCheck,
  Star,
  Sparkles,
} from "lucide-react";

import heroImg from "@/assets/hero-cabelo.jpg";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/site/PlanCard";
import { ProductCard } from "@/components/site/ProductCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { storefrontQuery, useStorefront } from "@/lib/storefront";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(storefrontQuery),
  head: () => ({
    meta: [
      { title: "Cia Cap — Produtos capilares sem prescrição" },
      {
        name: "description",
        content:
          "Dermocosméticos, tônicos, shampoos estimulantes e suplementos para sua rotina capilar. Conheça os produtos e responda ao questionário de preferências.",
      },
      { property: "og:title", content: "Cia Cap — Produtos capilares sem prescrição" },
      {
        property: "og:description",
        content: "Produtos capilares sem prescrição e um questionário gratuito para conhecer sua rotina.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TRUST = [
  { icon: Sparkles, label: "Cuidados sem prescrição" },
  { icon: ShieldCheck, label: "Dermocosméticos e suplementos" },
  { icon: Package, label: "Entrega dos produtos em casa" },
  { icon: RefreshCw, label: "Sem fidelidade" },
];

const STEPS = [
  { week: "Passo 1", title: "Sua rotina", text: "Responda ao questionário sobre seus hábitos e preferências de cuidados capilares." },
  { week: "Passo 2", title: "Escolha", text: "Confira a composição, o modo de uso e as informações de cada produto na loja." },
  { week: "Passo 3", title: "Entrega", text: "Finalize sua compra e acompanhe o status e o prazo do pedido na sua conta." },
  { week: "Passo 4", title: "Cuidado diário", text: "Use os produtos conforme o rótulo e respeite as orientações e restrições de uso." },
];

const TESTIMONIALS = [
  { quote: "Dermocosméticos e tônicos podem fazer parte dos cuidados com os fios e o couro cabeludo, conforme a indicação de cada produto.", name: "Dermocosméticos e tônicos" },
  { quote: "Escolha seu shampoo considerando a limpeza, as necessidades do couro cabeludo e as orientações de uso.", name: "Shampoos estimulantes" },
  { quote: "Suplementos complementam a alimentação quando indicados e não substituem uma dieta equilibrada ou cuidados de saúde.", name: "Suplementos" },
];

const FAQ = [
  {
    q: "Preciso de receita médica para comprar?",
    a: "Os produtos apresentados nesta proposta são dermocosméticos, tônicos, shampoos estimulantes e suplementos sem exigência de receita médica. Não oferecemos consultas por telemedicina nem emissão de receitas. Confira sempre a composição, a indicação e as restrições de cada produto.",
  },
  {
    q: "Como os produtos chegam até mim?",
    a: "Os produtos Cia Cap são comprados pelo carrinho e enviados para o endereço informado no pedido. O prazo é mostrado na compra; você acompanha o status, a previsão de entrega e o rastreio, quando disponível, na sua conta. Nos links de afiliados, a compra e a entrega são feitas pela loja parceira.",
  },
  {
    q: "Posso cancelar a assinatura quando quiser?",
    a: "Sim. Os planos não têm fidelidade. Você pode solicitar o cancelamento pela sua conta para interromper as próximas cobranças. Confira as condições da assinatura antes de contratar.",
  },
  {
    q: "Os produtos garantem o fim da queda ou o crescimento do cabelo?",
    a: "Não. Os efeitos dependem do produto e de características individuais; não prometemos cura, crescimento ou resultados garantidos. O questionário oferece sugestões de cuidados, não diagnóstico. Queda repentina, falhas, dor ou irritação persistente precisam de avaliação por um profissional de saúde.",
  },
  {
    q: "O que encontro na loja?",
    a: "Produtos Cia Cap e opções de lojas parceiras, incluindo dermocosméticos, tônicos, shampoos estimulantes e suplementos. Alguns links são de afiliados: podemos receber uma comissão, sem custo extra para você. Consulte o rótulo e as precauções de uso, especialmente para suplementos.",
  },
];

function Index() {
  const { plans: PLANS, affiliates: PRODUCTS } = useStorefront();
  const featuredProducts = PRODUCTS.filter((p) => p.badge).concat(
    PRODUCTS.filter((p) => !p.badge).slice(0, 1),
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="container-site grid items-center gap-10 pb-16 pt-10 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pb-24 md:pt-16">
          <div className="animate-rise">
            <span className="eyebrow inline-flex rounded-full bg-sage px-3 py-1.5 text-sage-foreground">
              Cuidados capilares sem prescrição
            </span>
            <h1 className="mt-6 text-[2.6rem] leading-[1.02] md:text-[4.2rem]">
              Cia Cap: produtos para sua rotina <em className="font-light italic text-copper">capilar.</em>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              Dermocosméticos, tônicos, shampoos estimulantes e suplementos sem prescrição médica.
              Escolha os cuidados que combinam com sua rotina.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="pill" size="xl">
                <Link to="/avaliacao">
                  Responder questionário gratuito <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="pill-outline" size="xl">
                <a href="#planos">Ver planos</a>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex text-copper">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>
              <span>Questionário sem cartão de crédito</span>
            </div>
          </div>

          <div className="relative animate-rise [animation-delay:150ms]">
            <div className="overflow-hidden rounded-[2rem] bg-sage">
              <img
                src={heroImg}
                alt="Homem passando a mão no cabelo perto da janela"
                width={1200}
                height={1408}
                className="aspect-[4/5] w-full object-cover md:aspect-[5/6]"
              />
            </div>
            <div className="absolute -bottom-6 left-4 right-4 md:-left-10 md:right-auto md:w-72">
              <div className="rounded-2xl border border-border bg-background/90 p-4 shadow-soft backdrop-blur"><p className="eyebrow text-muted-foreground">Sua rotina capilar</p><p className="mt-2 text-sm">Cuidados sem prescrição, no seu ritmo.</p></div>
            </div>
          </div>
        </section>

        {/* Trust band */}
        <section className="bg-forest-glow text-forest-foreground">
          <div className="container-site grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
            {TRUST.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <Icon className="size-5 shrink-0 text-copper" strokeWidth={1.75} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section id="como-funciona" className="container-site scroll-mt-20 py-20 md:py-28">
          <div className="max-w-xl">
            <span className="eyebrow text-copper">Como funciona</span>
            <h2 className="mt-3 text-4xl md:text-5xl">Da escolha à sua rotina</h2>
            <p className="mt-4 text-muted-foreground">
              Conheça as opções, escolha seus produtos e acompanhe a entrega pela sua conta.
            </p>
          </div>
          <ol className="mt-12 grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-3xl border border-border bg-card p-6">
                <span className="font-display text-5xl font-light text-copper/60">0{i + 1}</span>
                <p className="eyebrow mt-4 text-muted-foreground">{s.week}</p>
                <h3 className="mt-1 text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Plans */}
        <section id="planos" className="scroll-mt-20 bg-secondary/60 py-20 md:py-28">
          <div className="container-site">
            <div className="mx-auto max-w-xl text-center">
              <span className="eyebrow text-copper">Planos de assinatura</span>
              <h2 className="mt-3 text-4xl md:text-5xl">Cancele quando quiser</h2>
              <p className="mt-4 text-muted-foreground">
                Compare os planos e confira os itens e condições de cada assinatura.
              </p>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3 md:items-stretch">
              {PLANS.map((p) => (
                <PlanCard key={p.id} plan={p} productCopy />
              ))}
            </div>
            <p className="mx-auto mt-8 max-w-lg text-center text-xs text-muted-foreground">
              Produtos sem prescrição médica. Não sabe por onde começar?{" "}
              <Link to="/avaliacao" className="text-foreground underline underline-offset-4">
                Responda ao questionário de rotina capilar.
              </Link>
            </p>
          </div>
        </section>

        {/* Shop teaser */}
        <section className="container-site py-20 md:py-28">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <span className="eyebrow text-copper">Loja Cia Cap</span>
              <h2 className="mt-3 text-4xl md:text-5xl">Complete sua rotina</h2>
              <p className="mt-4 text-muted-foreground">
                Dermocosméticos, tônicos, shampoos estimulantes e suplementos para complementar seus cuidados.
              </p>
            </div>
            <Button asChild variant="pill-outline" size="xl" className="self-start md:self-auto">
              <Link to="/loja">
                Ver todos os produtos <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-forest-glow py-20 text-forest-foreground md:py-28">
          <div className="container-site">
            <span className="eyebrow text-copper">Cuidados capilares</span>
            <h2 className="mt-3 max-w-xl text-4xl md:text-5xl">Escolhas para o dia a dia</h2>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className="rounded-3xl border border-forest-foreground/15 p-7">
                  <blockquote className="font-display text-xl font-light leading-snug">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-2 text-sm text-forest-foreground/70">
                    {t.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="perguntas" className="container-site scroll-mt-20 py-20 md:py-28">
          <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
            <div>
              <span className="eyebrow text-copper">Dúvidas</span>
              <h2 className="mt-3 text-4xl md:text-5xl">Perguntas frequentes</h2>
            </div>
            <Accordion type="single" collapsible defaultValue="item-0">
              {FAQ.map((f, i) => (
                <AccordionItem key={f.q} value={`item-${i}`}>
                  <AccordionTrigger className="py-5 text-left font-display text-lg font-normal hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container-site pb-20 md:pb-28">
          <div className="rounded-[2rem] bg-sage px-6 py-14 text-center md:px-16 md:py-20">
            <h2 className="mx-auto max-w-2xl text-4xl md:text-5xl">
              Encontre produtos para sua rotina capilar.
            </h2>
            <p className="mt-4 text-sage-foreground/80">
              Leva 3 minutos. Sem compromisso, sem cartão de crédito.
            </p>
            <Button asChild variant="pill" size="xl" className="mt-8">
              <Link to="/avaliacao">
                Responder questionário <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <Button asChild variant="pill" size="xl" className="w-full">
          <Link to="/avaliacao">
            Responder questionário <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
