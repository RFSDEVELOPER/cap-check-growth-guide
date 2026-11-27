import { createFileRoute } from "@tanstack/react-router";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { companyValue } from "@/lib/company";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Cia Cap" },
      {
        name: "description",
        content: "Fale com a Cia Cap por e-mail ou WhatsApp. Respondemos em até 2 dias úteis.",
      },
      { property: "og:title", content: "Fale com a Cia Cap" },
      {
        property: "og:description",
        content: "Canais de atendimento da Cia Cap: e-mail, WhatsApp e horário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contato,
});

const SOON = "Canal em breve";

function Contato() {
  const channels = [
    { label: "E-mail de atendimento", value: companyValue("email", SOON) },
    { label: "WhatsApp", value: companyValue("whatsapp", SOON) },
    { label: "Horário de atendimento", value: companyValue("hours", SOON) },
  ];
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-site max-w-3xl pb-20 pt-10 md:pt-14">
        <span className="eyebrow text-copper">Atendimento</span>
        <h1 className="mt-2 text-4xl md:text-5xl">Fale com a gente</h1>
        <p className="mt-6 leading-relaxed text-muted-foreground">
          Respondemos as mensagens em até 2 dias úteis.
        </p>
        <ul className="mt-10 divide-y divide-border border-y border-border">
          {channels.map((c) => (
            <li key={c.label} className="flex flex-col gap-1 py-5 sm:flex-row sm:justify-between">
              <span className="eyebrow text-muted-foreground">{c.label}</span>
              <span className={c.value === SOON ? "text-muted-foreground" : "font-medium"}>
                {c.value}
              </span>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
