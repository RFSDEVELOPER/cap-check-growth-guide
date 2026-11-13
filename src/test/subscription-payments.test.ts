import { describe, expect, it } from "vitest";

import { pickSubscriptionId, subscriptionPaymentRow } from "@/lib/subscription-payments";

const SUB = { id: "sub-1", mp_preapproval_id: "pre-abc" };
const OTHER = { id: "sub-2", mp_preapproval_id: "pre-zzz" };

describe("pickSubscriptionId", () => {
  it("matches a recurring charge by the subscription external reference", () => {
    expect(pickSubscriptionId({ external_reference: "sub-1", preapproval_id: null }, [SUB])).toBe(
      "sub-1",
    );
  });

  it("matches a recurring charge by its preapproval id when the reference is missing", () => {
    expect(
      pickSubscriptionId({ external_reference: null, preapproval_id: "pre-abc" }, [SUB, OTHER]),
    ).toBe("sub-1");
  });

  it("returns null for a one-off order payment (no subscription matches)", () => {
    expect(
      pickSubscriptionId({ external_reference: "order-9", preapproval_id: null }, [SUB]),
    ).toBeNull();
  });

  it("does not attach a charge to another customer's subscription", () => {
    expect(
      pickSubscriptionId({ external_reference: null, preapproval_id: "pre-zzz" }, [SUB]),
    ).toBeNull();
  });
});

describe("subscriptionPaymentRow", () => {
  it("maps an approved monthly charge", () => {
    expect(
      subscriptionPaymentRow(
        {
          id: 987,
          status: "approved",
          transaction_amount: 89,
          date_approved: "2026-11-10T12:00:00Z",
        },
        "sub-1",
      ),
    ).toEqual({
      subscription_id: "sub-1",
      mp_payment_id: "987",
      amount: 89,
      status: "pago",
      paid_at: "2026-11-10T12:00:00Z",
    });
  });

  it("keeps a rejected charge as recusado without a paid date", () => {
    const row = subscriptionPaymentRow(
      { id: "988", status: "rejected", transaction_amount: 149.5 },
      "sub-1",
    );
    expect(row.status).toBe("recusado");
    expect(row.paid_at).toBeNull();
    expect(row.amount).toBe(149.5);
  });

  it("treats an unknown status as pendente instead of paid", () => {
    expect(
      subscriptionPaymentRow({ id: 1, status: "algo_novo", transaction_amount: 10 }, "s").status,
    ).toBe("pendente");
  });

  it("rounds the amount to centavos", () => {
    expect(
      subscriptionPaymentRow({ id: 1, status: "approved", transaction_amount: 89.999 }, "s").amount,
    ).toBe(90);
  });
});
