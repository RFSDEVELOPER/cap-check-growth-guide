import { describe, expect, it } from "vitest";

import { monthStartBR } from "@/lib/dates";

describe("monthStartBR", () => {
  it("starts the month at 00:00 Brazil time (03:00 UTC)", () => {
    expect(monthStartBR(new Date("2026-11-11T15:00:00Z"))).toBe("2026-11-01T03:00:00.000Z");
  });

  it("still counts the last evening of the month as the old month in Brazil", () => {
    // 01/12 01:00 UTC is still 30/11 22:00 in Brazil
    expect(monthStartBR(new Date("2026-12-01T01:00:00Z"))).toBe("2026-11-01T03:00:00.000Z");
  });

  it("rolls over at midnight Brazil time", () => {
    expect(monthStartBR(new Date("2026-12-01T03:00:00Z"))).toBe("2026-12-01T03:00:00.000Z");
  });

  it("handles January", () => {
    expect(monthStartBR(new Date("2027-01-15T12:00:00Z"))).toBe("2027-01-01T03:00:00.000Z");
  });
});
