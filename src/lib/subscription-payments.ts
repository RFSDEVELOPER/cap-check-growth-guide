import { ORDER_STATUS_FROM_MP } from "@/lib/checkout";

/** The fields of a Mercado Pago payment that identify a recurring charge. */
export interface MpChargeLike {
  id: number | string;
  status: string;
  transaction_amount: number;
  external_reference?: string | null;
  preapproval_id?: string | null;
  date_approved?: string | null;
}

export interface SubscriptionPaymentRow {
  subscription_id: string;
  mp_payment_id: string;
  amount: number;
  status: string;
  paid_at: string | null;
}

/**
 * Finds which subscription a payment belongs to. Recurring charges carry the subscription's
 * external reference (our subscription id) and/or the preapproval id; either one is enough.
 * Returns null for ordinary one-off order payments.
 */
export function pickSubscriptionId(
  charge: Pick<MpChargeLike, "external_reference" | "preapproval_id">,
  candidates: { id: string; mp_preapproval_id: string | null }[],
): string | null {
  const byRef = candidates.find(
    (c) => charge.external_reference && c.id === charge.external_reference,
  );
  if (byRef) return byRef.id;
  const byPre = candidates.find(
    (c) => charge.preapproval_id && c.mp_preapproval_id === charge.preapproval_id,
  );
  return byPre ? byPre.id : null;
}

/** The row stored in subscription_payments for one charge (upserted on mp_payment_id). */
export function subscriptionPaymentRow(
  charge: MpChargeLike,
  subscriptionId: string,
): SubscriptionPaymentRow {
  return {
    subscription_id: subscriptionId,
    mp_payment_id: String(charge.id),
    amount: Math.round(Number(charge.transaction_amount) * 100) / 100,
    status: ORDER_STATUS_FROM_MP[charge.status] ?? "pendente",
    paid_at: charge.date_approved ?? null,
  };
}
