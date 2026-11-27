import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalSection } from "@/components/site/LegalPage";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { COMPANY, isPlaceholder } from "@/lib/company";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Cia Cap — Cuidados capilares sem prescrição" },
      {
        name: "description",
        content:
          "Conheça a Cia Cap: loja de cuidados capilares sem prescrição, com dermocosméticos, suplementos e planos de assinatura.",
      },
      { property: "og:title", content: "Sobre a Cia Cap" },
      {
        property: "og:description",
        content: "Quem somos, como trabalhamos e quem é responsável pela loja Cia Cap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sobre,
});

const RESPONSIBLE = [
  { label: "Razão social", value: COMPANY.legalName },
  { label: "CNPJ", value: COMPANY.cnpj },
  { label: "Endereço", value: COMPANY.address },
];

function Sobre() {
  const rows = RESPONSIBLE.filter((r) => import.meta.env.DEV || !isPlaceholder(r.value));
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-site max-w-3xl pb-20 pt-10 md:pt-14">
        <span className="eyebrow text-copper">Quem somos</span>
        <h1 className="mt-2 text-4xl md:text-5xl">Sobre a Cia Cap</h1>
        <p className="mt-6 leading-relaxed text-muted-foreground">
          A Cia Cap é uma loja de cuidados capilares. Vendemos produtos sem prescrição,
          dermocosméticos e suplementos, e oferecemos planos de assinatura para quem quer receber a
          rotina em casa todo mês.
        </p>

        <div className="mt-10 space-y-10">
          <LegalSection title="Como trabalhamos">
            <ul>
              <li>
                <strong>Curadoria de produtos:</strong> escolhemos cada item pensando em uma rotina
                simples e fácil de seguir.
              </li>
              <li>
                <strong>Informação clara de uso:</strong> mostramos como usar cada produto, conforme
                o rótulo do fabricante.
              </li>
              <li>
                <strong>Atendimento:</strong> respondemos dúvidas sobre pedidos, entregas e
                assinaturas pelos nossos canais.
              </li>
            </ul>
          </LegalSection>

          <LegalSection title="Quem é responsável pela loja">
            {rows.length > 0 ? (
              <ul>
                {rows.map((r) => (
                  <li key={r.label}>
                    <strong>{r.label}:</strong> {r.value}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Os dados da empresa responsável serão publicados em breve.</p>
            )}
          </LegalSection>

          <p className="flex flex-wrap gap-6 text-sm">
            <Link to="/contato" className="text-copper underline underline-offset-4">
              Fale com a gente
            </Link>
            <Link to="/privacidade" className="text-copper underline underline-offset-4">
              Política de privacidade
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
