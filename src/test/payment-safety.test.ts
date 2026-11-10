import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { resolveOrderStatus } from "@/lib/checkout";
import { verifyMpSignature } from "@/lib/mercadopago.server";
import { safeRedirect } from "@/lib/safe-redirect";

describe("resolveOrderStatus", () => {
  it("never lets a rejected or cancelled attempt overwrite a paid order", () => {
    expect(resolveOrderStatus("pago", "recusado")).toBe("pago");
    expect(resolveOrderStatus("pago", "cancelado")).toBe("pago");
    expect(resolveOrderStatus("pago", "pendente")).toBe("pago");
  });

  it("lets a paid order be refunded, and keeps it refunded", () => {
    expect(resolveOrderStatus("pago", "reembolsado")).toBe("reembolsado");
    expect(resolveOrderStatus("reembolsado", "pago")).toBe("reembolsado");
  });

  it("follows the new status while the order is not paid yet", () => {
    expect(resolveOrderStatus("pendente", "pago")).toBe("pago");
    expect(resolveOrderStatus("pendente", "recusado")).toBe("recusado");
    expect(resolveOrderStatus("recusado", "pago")).toBe("pago");
  });
});

describe("verifyMpSignature", () => {
  const secret = "segredo-de-teste";
  const sign = (id: string, requestId: string, ts: string) =>
    createHmac("sha256", secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest("hex");

  it("accepts a valid, recent signature", async () => {
    const ts = String(Date.now());
    const header = `ts=${ts},v1=${sign("abc123", "req-1", ts)}`;
    expect(await verifyMpSignature(secret, header, "req-1", "ABC123")).toBe(true);
  });

  it("rejects a tampered signature, a wrong secret and a missing header", async () => {
    const ts = String(Date.now());
    const good = sign("abc123", "req-1", ts);
    const tampered = good.slice(0, -1) + (good.endsWith("0") ? "1" : "0");
    expect(await verifyMpSignature(secret, `ts=${ts},v1=${tampered}`, "req-1", "abc123")).toBe(
      false,
    );
    expect(await verifyMpSignature("outro", `ts=${ts},v1=${good}`, "req-1", "abc123")).toBe(false);
    expect(await verifyMpSignature(secret, null, "req-1", "abc123")).toBe(false);
    expect(await verifyMpSignature(secret, `v1=${good}`, "req-1", "abc123")).toBe(false);
  });

  it("rejects a valid but old signature (replay)", async () => {
    const ts = String(Date.now() - 60 * 60_000);
    const header = `ts=${ts},v1=${sign("abc123", "req-1", ts)}`;
    expect(await verifyMpSignature(secret, header, "req-1", "abc123")).toBe(false);
  });
});

describe("safeRedirect", () => {
  it("allows internal paths only", () => {
    expect(safeRedirect("/carrinho")).toBe("/carrinho");
    expect(safeRedirect("//evil.com")).toBe("/conta");
    expect(safeRedirect("/\\evil.com")).toBe("/conta");
    expect(safeRedirect("https://evil.com")).toBe("/conta");
    expect(safeRedirect("/auth")).toBe("/conta");
    expect(safeRedirect(undefined)).toBe("/conta");
    expect(safeRedirect(42)).toBe("/conta");
  });
});
