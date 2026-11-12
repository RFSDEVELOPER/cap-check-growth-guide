import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { COMPANY, pendingCompanyFields } from "@/lib/company";

const FIELD_LABEL: Record<string, string> = {
  legalName: "razão social",
  cnpj: "CNPJ",
  address: "endereço",
  email: "e-mail de atendimento",
  whatsapp: "WhatsApp",
  hours: "horário de atendimento",
  dpoName: "nome do encarregado de dados",
  dpoEmail: "e-mail do encarregado de dados",
};

/** Shared layout for the legal pages: title, last review date and a pending-data warning. */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const pending = pendingCompanyFields().filter((f) => f in FIELD_LABEL);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-site max-w-3xl pb-20 pt-10 md:pt-14">
        <span className="eyebrow text-copper">Informações legais</span>
        <h1 className="mt-2 text-4xl md:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: {COMPANY.legalUpdatedAt}
        </p>
        <p className="mt-6 leading-relaxed text-muted-foreground">{intro}</p>

        {pending.length > 0 && (
          <div
            role="note"
            className="mt-8 flex gap-3 rounded-2xl border border-copper/40 bg-copper/10 p-5 text-sm"
          >
            <AlertTriangle className="size-5 shrink-0 text-copper" />
            <p>
              <strong>Texto-modelo, ainda não publicável.</strong> Preencha os dados da empresa em{" "}
              <code>src/lib/company.ts</code> (faltam:{" "}
              {pending.map((f) => FIELD_LABEL[f]).join(", ")}) e peça a revisão de um advogado antes
              de lançar. Este aviso some quando tudo estiver preenchido.
            </p>
          </div>
        )}

        <div className="mt-10 space-y-10">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_a]:text-copper [&_a]:underline">
        {children}
      </div>
    </section>
  );
}

/** Contact line that falls back to a neutral text while the data is still a placeholder. */
export function Contact({ field }: { field: "email" | "whatsapp" | "dpoEmail" }) {
  const value = COMPANY[field];
  if (value.startsWith("[PREENCHER")) return <em>(canal a definir)</em>;
  return field === "whatsapp" ? <strong>{value}</strong> : <a href={`mailto:${value}`}>{value}</a>;
}
