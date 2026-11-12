import { describe, expect, it } from "vitest";
import { buildOrder } from "@/lib/checkout";

const catalog = {
  products: [
    {
      id: "a",
      name: "A",
      price: 50,
      promoPrice: null,
      promoUntil: null,
      stock: 10,
      deliveryDays: 3,
    },
  ],
  settings: { shippingFee: 15, freeShippingMin: 200, lowStockAlert: 5 },
};

describe("shipping quoted by CEP", () => {
  it("uses the carrier price and the longer delivery time", () => {
    const o = buildOrder([{ id: "a", qty: 1 }], catalog, null, new Date(), {
      service: "Correios PAC",
      price: 22.4,
      days: 8,
    });
    expect(o.shipping).toBe(22.4);
    expect(o.total).toBe(72.4);
    expect(o.deliveryDays).toBe(8);
    expect(o.shippingService).toBe("Correios PAC");
  });
  it("is free from the minimum order value", () => {
    const o = buildOrder([{ id: "a", qty: 4 }], catalog, null, new Date(), {
      service: "Jadlog",
      price: 30,
      days: 5,
    });
    expect(o.shipping).toBe(0);
  });
  it("falls back to the fixed fee without a quote", () => {
    expect(buildOrder([{ id: "a", qty: 1 }], catalog).shipping).toBe(15);
  });
});
