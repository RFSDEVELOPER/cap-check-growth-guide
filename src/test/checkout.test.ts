import { describe, expect, it } from "vitest";

import { buildOrder, planMonthlyAmount } from "@/lib/checkout";

describe("buildOrder", () => {
  it("uses catalog prices: 2 shampoos (59) + 1 tônico (79) = 197", () => {
    const order = buildOrder([
      { id: "shampoo-cia-cap", qty: 2 },
      { id: "tonico-cia-cap", qty: 1 },
    ]);
    expect(order.total).toBe(197);
  });

  it("rejects products that are not in the store", () => {
    expect(() => buildOrder([{ id: "produto-falso", qty: 1 }])).toThrow();
  });

  it("limits each product to 10 units", () => {
    const order = buildOrder([{ id: "shampoo-cia-cap", qty: 50 }]);
    expect(order.lines[0]?.qty).toBe(10);
  });

  it("rejects an empty cart", () => {
    expect(() => buildOrder([])).toThrow();
  });
});

describe("planMonthlyAmount", () => {
  it("charges R$89, R$149 and R$219 per month", () => {
    expect(planMonthlyAmount("essencial")).toBe(89);
    expect(planMonthlyAmount("completo")).toBe(149);
    expect(planMonthlyAmount("avancado")).toBe(219);
  });
});
