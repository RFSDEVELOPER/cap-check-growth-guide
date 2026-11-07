import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Package,
  RefreshCw,
  ShieldCheck,
  Star,
  Stethoscope,
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
import { PLANS, PRODUCTS } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cia Cap — Tratamento para queda de cabelo com médico" },
      {
        name: "description",
        content:
          "Faça uma avaliação de 3 minutos, fale com um médico por telemedicina e receba seu tratamento capilar manipulado em casa.",
      },
      { property: "og:title", content: "Cia Cap — Tratamento para queda de cabelo com médico" },
      {
        property: "og:description",
        content: "Avaliação gratuita, médico parceiro e fórmula manipulada entregue todo mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TRUST = [
  { icon: Stethoscope, label: "Avaliação por telemedicina" },
  { icon: ShieldCheck, label: "Farmácias credenciadas" },
  { icon: Package, label: "Entrega recorrente em casa" },
  { icon: RefreshCw, label: "Sem fidelidade" },
];

const STEPS = [
  { week: "Semana 1", title: "Avaliação", text: "Você responde o questionário e um médico parceiro avalia seu caso." },
  { week: "Semana 2", title: "Início", text: "A fórmula prescrita é manipulada e enviada por farmácia credenciada." },
  { week: "Semana 8", title: "Primeiros sinais", text: "A maioria dos pacientes relata menos queda no travesseiro e no banho." },
  { week: "Semana 16+", title: "Resultado visível", text: "Reavaliação médica e ajuste do plano conforme sua evolução." },
];

const TESTIMONIALS = [
  { quote: "Comecei achando que era propaganda, mas o acompanhamento médico fez diferença. Sigo há 4 meses.", name: "Rafael M., 34" },
  { quote: "Não precisei sair de casa para a consulta. A farmácia manda certinho todo mês.", name: "Carla S., 29" },
  { quote: "Ter avaliação de verdade antes de qualquer fórmula foi o que me convenceu.", name: "Diego P., 41" },
];

const FAQ = [
  {
    q: "Preciso de receita médica?",
    a: "Depende do tratamento. Alguns ativos, como o minoxidil oral, exigem prescrição. Por isso todo plano começa com a avaliação de um médico parceiro por telemedicina.",
  },
  {
    q: "Como a fórmula chega até mim?",
    a: "Depois da prescrição, uma farmácia de manipulação credenciada prepara sua fórmula e envia para o seu endereço. A reposição acontece automaticamente todo mês.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Não existe fidelidade: você cancela pela sua área de paciente e não há cobrança no mês seguinte.",
  },
  {
    q: "Funciona para queda em qualquer fase?",
    a: "Quanto antes começar, melhor. Em casos antigos ou extensos, o médico pode indicar o plano Avançado com consulta dermatológica dedicada.",
  },
  {
    q: "O que são os produtos da loja?",
    a: "São itens que complementam o tratamento, vendidos por lojas parceiras. Alguns links são de afiliados e podemos receber uma comissão, sem custo extra para você.",
  },
];

function DensityCurve() {
  const pts = [
    [12, 150],
    [80, 122],
    [140, 82],
    [200, 50],
    [268, 30],
  ];
  return (
    <div className="rounded-2xl border border-border/80 bg-background/90 p-4 shadow-soft backdrop-blur">
      <p className="eyebrow text-muted-foreground">Densidade relatada</p>
      <svg viewBox="0 0 280 170" className="mt-2 h-28 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="curve" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--chart-2)" />
            <stop offset="100%" stopColor="var(--copper)" />
          </linearGradient>
        </defs>
        {[40, 80, 120, 160].map((y) => (
          <line key={y} x1="0" x2="280" y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
        ))}
        <path
          d="M12 150 C 50 145, 60 130, 80 122 S 120 92, 140 82 S 180 56, 200 50 S 250 34, 268 30"
          fill="none"
          stroke="url(#curve)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="600"
          className="animate-draw"
        />
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="4.5" fill="var(--background)" stroke="var(--primary)" strokeWidth="2" />
            <text x={x} y={y - 10} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
              S{i * 6}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Index() {
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
              Saúde capilar com médico
            </span>
            <h1 className="mt-6 text-[2.6rem] leading-[1.02] md:text-[4.2rem]">
              Sua queda de cabelo, avaliada por médico{" "}
              <em className="font-light italic text-copper">antes</em> de virar tratamento.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              Questionário de 3 minutos, consulta por telemedicina e fórmula manipulada entregue em
              casa todo mês.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="pill" size="xl">
                <Link to="/avaliacao">
                  Iniciar avaliação gratuita <ArrowRight />
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
              <span>Avaliação sem cartão de crédito</span>
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
              <DensityCurve />
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
            <h2 className="mt-3 text-4xl md:text-5xl">Como o tratamento avança</h2>
            <p className="mt-4 text-muted-foreground">
              Cada etapa tem um responsável claro: você, o médico e a farmácia parceira.
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
                O médico define o tratamento. O plano define o que vem incluso.
              </p>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3 md:items-stretch">
              {PLANS.map((p) => (
                <PlanCard key={p.id} plan={p} />
              ))}
            </div>
            <p className="mx-auto mt-8 max-w-lg text-center text-xs text-muted-foreground">
              O tratamento prescrito depende de avaliação médica individual. Não sabe qual escolher?{" "}
              <Link to="/avaliacao" className="text-foreground underline underline-offset-4">
                A avaliação indica o plano certo.
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
                Produtos selecionados que combinam com o tratamento, de lojas parceiras.
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
            <span className="eyebrow text-copper">Pacientes</span>
            <h2 className="mt-3 max-w-xl text-4xl md:text-5xl">Quem já começou o acompanhamento</h2>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className="rounded-3xl border border-forest-foreground/15 p-7">
                  <blockquote className="font-display text-xl font-light leading-snug">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-2 text-sm text-forest-foreground/70">
                    <BadgeCheck className="size-4 text-copper" /> {t.name}
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
              O primeiro passo é entender seu caso.
            </h2>
            <p className="mt-4 text-sage-foreground/80">
              Leva 3 minutos. Sem compromisso, sem cartão de crédito.
            </p>
            <Button asChild variant="pill" size="xl" className="mt-8">
              <Link to="/avaliacao">
                Iniciar avaliação <ArrowRight />
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
            Fazer avaliação gratuita <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
