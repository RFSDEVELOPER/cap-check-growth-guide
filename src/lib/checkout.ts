import { getPlanById, getShopProduct, MAX_QTY_PER_ITEM, SHIPPING_FEE } from "@/lib/catalog";

export interface CartLine {
  id: string;
  qty: number;
}

export interface OrderLine {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDraft {
  lines: OrderLine[];
  subtotal: number;
  shipping: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Builds an order from cart lines using catalog prices only.
 * Unknown products are rejected; quantities are clamped to 1..MAX_QTY_PER_ITEM.
 */
export function buildOrder(cart: CartLine[]): OrderDraft {
  const merged = new Map<string, number>();
  for (const line of cart) {
    merged.set(line.id, (merged.get(line.id) ?? 0) + Math.floor(line.qty));
  }

  const lines: OrderLine[] = [];
  for (const [id, rawQty] of merged) {
    const product = getShopProduct(id);
    if (!product) throw new Error(`Produto desconhecido: ${id}`);
    const qty = Math.min(Math.max(rawQty, 1), MAX_QTY_PER_ITEM);
    lines.push({
      id,
      name: product.name,
      qty,
      unitPrice: product.price,
      subtotal: round2(product.price * qty),
    });
  }
  if (lines.length === 0) throw new Error("Carrinho vazio");

  const subtotal = round2(lines.reduce((s, l) => s + l.subtotal, 0));
  return { lines, subtotal, shipping: SHIPPING_FEE, total: round2(subtotal + SHIPPING_FEE) };
}

/** Monthly amount charged for a plan subscription. */
export function planMonthlyAmount(planId: string): number {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Plano desconhecido: ${planId}`);
  return plan.price;
}

export const ORDER_STATUS_FROM_MP: Record<string, string> = {
  approved: "pago",
  authorized: "pago",
  pending: "pendente",
  in_process: "pendente",
  in_mediation: "pendente",
  rejected: "recusado",
  cancelled: "cancelado",
  refunded: "reembolsado",
  charged_back: "reembolsado",
};

export const SUBSCRIPTION_STATUS_FROM_MP: Record<string, string> = {
  authorized: "ativa",
  pending: "pendente",
  paused: "pausada",
  cancelled: "cancelada",
};

export const STATUS_LABEL: Record<string, string> = {
  pago: "Pago",
  pendente: "Aguardando pagamento",
  recusado: "Pagamento recusado",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
  ativa: "Ativa",
  pausada: "Pausada",
  cancelada: "Cancelada",
};
