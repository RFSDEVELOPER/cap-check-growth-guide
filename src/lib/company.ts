/**
 * Company data shown in the footer and used by the legal pages (privacy, terms, returns).
 *
 * Fill in every "[PREENCHER: ...]" value below before going live. While any value is still a
 * placeholder, the legal pages show a warning banner and the footer hides that field, so the
 * placeholder text never reaches customers by accident.
 */
export const COMPANY = {
  tradeName: "Cia Cap",
  legalName: "[PREENCHER: razão social]",
  cnpj: "[PREENCHER: CNPJ]",
  address: "[PREENCHER: endereço completo com CEP]",
  email: "[PREENCHER: e-mail de atendimento]",
  whatsapp: "[PREENCHER: WhatsApp com DDD]",
  hours: "[PREENCHER: horário de atendimento]",
  /** Person or role in charge of personal data (LGPD "encarregado"). */
  dpoName: "[PREENCHER: nome do encarregado de dados]",
  dpoEmail: "[PREENCHER: e-mail do encarregado de dados]",
  /** Last review of the legal texts. Update it when the texts change. */
  legalUpdatedAt: "11 de novembro de 2026",
} as const;

export type CompanyField = keyof typeof COMPANY;

export const isPlaceholder = (value: string): boolean => value.startsWith("[PREENCHER");

/** Names of the company fields that are still placeholders. */
export function pendingCompanyFields(company: Record<string, string> = COMPANY): string[] {
  return Object.entries(company)
    .filter(([, value]) => isPlaceholder(value))
    .map(([key]) => key);
}

/** The value, or `fallback` while it is still a placeholder (for public-facing text). */
export function companyValue(field: CompanyField, fallback = ""): string {
  const value = COMPANY[field];
  return isPlaceholder(value) ? fallback : value;
}
