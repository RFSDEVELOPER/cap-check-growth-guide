import { afterEach, describe, expect, it, vi } from "vitest";

import { mpRequest } from "@/lib/mercadopago.server";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => vi.unstubAllGlobals());

describe("mpRequest", () => {
  it("retries a GET after a network error and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce(ok({ id: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(mpRequest("t", "/v1/payments/1", { retryBaseMs: 0 })).resolves.toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a 5xx answer but gives up after 3 attempts", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response("boom", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(mpRequest("t", "/v1/payments/1", { retryBaseMs: 0 })).rejects.toThrow("[503]");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("never retries a POST without an idempotency key (no double charge)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      mpRequest("t", "/checkout/preferences", { method: "POST", body: {}, retryBaseMs: 0 }),
    ).rejects.toThrow("[network]");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 4xx answer", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response("bad", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(mpRequest("t", "/v1/payments/1", { retryBaseMs: 0 })).rejects.toThrow("[401]");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
