import { describe, expect, it } from "vitest";

import { COMPANY, companyValue, isPlaceholder, pendingCompanyFields } from "@/lib/company";

describe("company data", () => {
  it("recognises placeholders and hides them from public text", () => {
    expect(isPlaceholder("[PREENCHER: CNPJ]")).toBe(true);
    expect(isPlaceholder("12.345.678/0001-90")).toBe(false);
    expect(companyValue("cnpj")).toBe(COMPANY.cnpj === "[PREENCHER: CNPJ]" ? "" : COMPANY.cnpj);
    expect(companyValue("legalName", "Cia Cap")).toBeTruthy();
  });

  it("lists only the fields that are still pending", () => {
    const pending = pendingCompanyFields({
      tradeName: "Cia Cap",
      cnpj: "[PREENCHER: CNPJ]",
      email: "ola@ciacap.com.br",
    });
    expect(pending).toEqual(["cnpj"]);
  });

  it("keeps every contact field filled with a placeholder or a real value", () => {
    for (const value of Object.values(COMPANY)) expect(value.trim().length).toBeGreaterThan(0);
  });
});
