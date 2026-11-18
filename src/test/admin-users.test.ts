import { describe, expect, it } from "vitest";

import { adminEmailSchema, canRevokeAdmin } from "@/lib/admin-users";
import { buildCustomerRegistration } from "@/lib/customer-account";

describe("admin revocation", () => {
  it("refuses when administrators try to remove their own last access", () => {
    expect(canRevokeAdmin({ targetUserId: "a", currentUserId: "a", adminCount: 1 })).toBe(false);
  });

  it("allows self-removal when another administrator remains", () => {
    expect(canRevokeAdmin({ targetUserId: "a", currentUserId: "a", adminCount: 2 })).toBe(true);
  });

  it("allows an administrator to remove another administrator", () => {
    expect(canRevokeAdmin({ targetUserId: "b", currentUserId: "a", adminCount: 2 })).toBe(true);
  });
});

describe("admin email validation", () => {
  it("accepts a valid email and normalizes its case", () => {
    expect(adminEmailSchema.parse("Pessoa@Empresa.com")).toBe("pessoa@empresa.com");
  });

  it("rejects an empty email", () => {
    expect(adminEmailSchema.safeParse("").success).toBe(false);
  });

  it("rejects an email without @", () => {
    expect(adminEmailSchema.safeParse("pessoa.empresa.com").success).toBe(false);
  });

  it("rejects an email containing spaces", () => {
    expect(adminEmailSchema.safeParse("pessoa @empresa.com").success).toBe(false);
  });

  it("rejects an email longer than 254 characters", () => {
    expect(adminEmailSchema.safeParse(`${"a".repeat(249)}@x.com`).success).toBe(false);
  });
});

describe("public customer registration", () => {
  it("builds a customer account without sending an admin role", () => {
    const registration = buildCustomerRegistration(
      {
        name: "Cliente Teste",
        email: "cliente@example.com",
        phone: "(11) 99999-9999",
        password: "senha-segura",
      },
      "https://cia-cap.lovable.app",
    );

    expect(registration.initialRole).toBe("user");
    expect(registration.credentials.options.data).toEqual({
      full_name: "Cliente Teste",
      phone: "(11) 99999-9999",
    });
    expect(registration.credentials.options.data).not.toHaveProperty("role");
    expect(JSON.stringify(registration.credentials)).not.toContain("admin");
  });
});
