import { describe, expect, it } from "vitest";

import { effectivePrice } from "@/lib/catalog";
import { buildOrder, CheckoutError, couponProblem, type Coupon } from "@/lib/checkout";

const NOW = new Date("2026-11-08T12:00:00Z");

const product = (id: string, price: number, extra: Partial<{ promoPrice: number | null; promoUntil: string | null; stock: number; deliveryDays: number }> = {}) => ({
  id,
  name: id,
  price,
  promoPrice: null,
  promoUntil: null,
  stock: 50,
  deliveryDays: 7,
  ...extra,
});

const catalog = (overrides: Partial<{ shippingFee: number; freeShippingMin: number | null }> = {}, products = [
  product("shampoo-cia-cap", 59),
  product("tonico-cia-cap", 79, { deliveryDays: 10 }),
]) => ({
  products,
  settings: { shippingFee: 0, freeShippingMin: null, lowStockAlert: 5, ...overrides },
});

const coupon = (c: Partial<Coupon>): Coupon => ({
  code: "TESTE",
  kind: "percent",
  value: 10,
  min_order: 0,
  starts_at: null,
  ends_at: null,
  max_uses: null,
  used_count: 0,
  active: true,
  ...c,
});

describe("buildOrder", () => {
  it("uses database prices: 2 shampoos (59) + 1 tônico (79) = 197", () => {
    const order = buildOrder(
      [
        { id: "shampoo-cia-cap", qty: 2 },
        { id: "tonico-cia-cap", qty: 1 },
      ],
      catalog(),
      null,
      NOW,
    );
    expect(order.total).toBe(197);
  });

  it("uses the longest delivery time among the items", () => {
    const order = buildOrder([{ id: "shampoo-cia-cap", qty: 1 }, { id: "tonico-cia-cap", qty: 1 }], catalog(), null, NOW);
    expect(order.deliveryDays).toBe(10);
  });

  it("rejects products that are not in the store", () => {
    expect(() => buildOrder([{ id: "produto-falso", qty: 1 }], catalog(), null, NOW)).toThrow(CheckoutError);
  });

  it("limits each product to 10 units", () => {
    const order = buildOrder([{ id: "shampoo-cia-cap", qty: 50 }], catalog(), null, NOW);
    expect(order.lines[0]?.qty).toBe(10);
  });

  it("refuses more units than in stock", () => {
    const c = catalog({}, [product("shampoo-cia-cap", 59, { stock: 2 })]);
    expect(() => buildOrder([{ id: "shampoo-cia-cap", qty: 3 }], c, null, NOW)).toThrow(/sem_estoque/);
  });

  it("rejects an empty cart", () => {
    expect(() => buildOrder([], catalog(), null, NOW)).toThrow();
  });

  it("charges the promo price while it is valid, and the normal price after it ends", () => {
    const p = product("shampoo-cia-cap", 59, { promoPrice: 49, promoUntil: "2026-11-10T00:00:00Z" });
    expect(effectivePrice(p, NOW)).toBe(49);
    expect(effectivePrice(p, new Date("2026-11-11T00:00:00Z"))).toBe(59);
  });

  it("charges the shipping fee, but free shipping from the minimum amount", () => {
    const c = catalog({ shippingFee: 15, freeShippingMin: 150 });
    expect(buildOrder([{ id: "shampoo-cia-cap", qty: 1 }], c, null, NOW).total).toBe(74);
    expect(buildOrder([{ id: "shampoo-cia-cap", qty: 3 }], c, null, NOW).shipping).toBe(0);
  });

  it("applies a 10% coupon: 2 shampoos 118 → 106.20", () => {
    const order = buildOrder([{ id: "shampoo-cia-cap", qty: 2 }], catalog(), coupon({}), NOW);
    expect(order.discount).toBe(11.8);
    expect(order.total).toBe(106.2);
  });

  it("applies a fixed R$20 coupon and a free-shipping coupon", () => {
    const c = catalog({ shippingFee: 15 });
    expect(buildOrder([{ id: "shampoo-cia-cap", qty: 1 }], c, coupon({ kind: "fixed", value: 20 }), NOW).total).toBe(54);
    expect(buildOrder([{ id: "shampoo-cia-cap", qty: 1 }], c, coupon({ kind: "frete", value: 0 }), NOW).total).toBe(59);
  });

  it("refuses expired, used-up or below-minimum coupons", () => {
    expect(couponProblem(coupon({ ends_at: "2026-11-01T00:00:00Z" }), 100, NOW)).not.toBeNull();
    expect(couponProblem(coupon({ max_uses: 5, used_count: 5 }), 100, NOW)).not.toBeNull();
    expect(couponProblem(coupon({ min_order: 150 }), 100, NOW)).not.toBeNull();
    expect(couponProblem(coupon({}), 100, NOW)).toBeNull();
  });
});
