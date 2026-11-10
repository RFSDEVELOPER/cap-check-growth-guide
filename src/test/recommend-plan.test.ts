import { describe, expect, it } from "vitest";

import { recommendPlan } from "@/lib/catalog";

describe("recommendPlan", () => {
  it("recommends Essencial for early, mild hair loss", () => {
    const r = recommendPlan({
      tempo: "menos-1",
      area: "entradas",
      familia: "nao",
      historico: "nunca",
      objetivo: "parar",
      sinais: "nenhum",
    });
    expect(r.plan).toBe("essencial");
  });

  it("recommends Completo for moderate hair loss", () => {
    const r = recommendPlan({
      tempo: "1-3",
      area: "coroa",
      familia: "sim",
      historico: "minoxidil",
      objetivo: "densidade",
      sinais: "nenhum",
    });
    expect(r.plan).toBe("completo");
  });

  it("recommends Avançado for long or extensive hair loss", () => {
    const r = recommendPlan({
      tempo: "mais-5",
      area: "extensa",
      familia: "sim",
      historico: "sem-resultado",
      objetivo: "densidade",
      sinais: "nenhum",
    });
    expect(r.plan).toBe("avancado");
  });

  it("sends sudden patchy loss to a professional without suggesting any plan", () => {
    const r = recommendPlan({ tempo: "menos-1", area: "entradas", sinais: "falhas" });
    expect(r.plan).toBe("nenhum");
    expect(r.needsDermatologist).toBe(true);
  });

  it("does the same for very fast loss, whatever the score", () => {
    const r = recommendPlan({
      tempo: "mais-5",
      area: "extensa",
      familia: "sim",
      historico: "sem-resultado",
      objetivo: "densidade",
      sinais: "subita",
    });
    expect(r.plan).toBe("nenhum");
    expect(r.needsDermatologist).toBe(true);
  });
});
