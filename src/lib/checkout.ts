import {
  effectivePrice,
  MAX_QTY_PER_ITEM,
  type ShopProduct,
  type StoreSettings,
} from "@/lib/catalog";

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

export interface Coupon {
  code: string;
  kind: "percent" | "fixed" | "frete";
  value: number;
  min_order: number;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  used_count: number;
  active: boolean;
}

export interface OrderDraft {
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  /** Longest delivery time among the products, in days. */
  deliveryDays: number;
  couponCode: string | null;
  /** Carrier service chosen by the customer, when shipping was quoted by CEP. */
  shippingService: string | null;
}

export interface ShippingChoice {
  service: string;
  price: number;
  days: number;
}

export type CheckoutErrorCode =
  | "frete_indisponivel"
  | "carrinho_vazio"
  | "produto_indisponivel"
  | "sem_estoque"
  | "cupom_invalido";

export class CheckoutError extends Error {
  constructor(
    public code: CheckoutErrorCode,
    public detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Why a coupon can't be used for this subtotal, or null when it is valid. */
export function couponProblem(
  coupon: Coupon,
  subtotal: number,
  now: Date = new Date(),
): string | null {
  if (!coupon.active) return "Cupom desativado";
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return "Cupom ainda não começou";
  if (coupon.ends_at && new Date(coupon.ends_at) <= now) return "Cupom expirado";
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) return "Cupom esgotado";
  if (subtotal < coupon.min_order) return `Válido para compras a partir de R$ ${coupon.min_order}`;
  return null;
}

/**
 * Builds an order using database prices only (promo price while valid), checking stock,
 * applying the coupon and the shipping rules. The browser never sets prices.
 */
export function buildOrder(
  cart: CartLine[],
  catalog: {
    products: Pick<
      ShopProduct,
      "id" | "name" | "price" | "promoPrice" | "promoUntil" | "stock" | "deliveryDays"
    >[];
    settings: StoreSettings;
  },
  coupon: Coupon | null = null,
  now: Date = new Date(),
  shippingChoice: ShippingChoice | null = null,
): OrderDraft {
  const merged = new Map<string, number>();
  for (const line of cart) {
    merged.set(line.id, (merged.get(line.id) ?? 0) + Math.floor(line.qty));
  }

  const lines: OrderLine[] = [];
  let deliveryDays = 0;
  for (const [id, rawQty] of merged) {
    const product = catalog.products.find((p) => p.id === id);
    if (!product) throw new CheckoutError("produto_indisponivel", id);
    const qty = Math.min(Math.max(rawQty, 1), MAX_QTY_PER_ITEM);
    if (qty > product.stock) throw new CheckoutError("sem_estoque", product.name);
    const unitPrice = effectivePrice(product, now);
    lines.push({ id, name: product.name, qty, unitPrice, subtotal: round2(unitPrice * qty) });
    deliveryDays = Math.max(deliveryDays, product.deliveryDays);
  }
  if (lines.length === 0) throw new CheckoutError("carrinho_vazio");

  const subtotal = round2(lines.reduce((s, l) => s + l.subtotal, 0));

  let discount = 0;
  let freeShippingByCoupon = false;
  if (coupon) {
    const problem = couponProblem(coupon, subtotal, now);
    if (problem) throw new CheckoutError("cupom_invalido", problem);
    if (coupon.kind === "percent")
      discount = round2((subtotal * Math.min(coupon.value, 100)) / 100);
    else if (coupon.kind === "fixed") discount = round2(Math.min(coupon.value, subtotal));
    else freeShippingByCoupon = true;
  }

  const afterDiscount = round2(subtotal - discount);
  const { shippingFee, freeShippingMin } = catalog.settings;
  const freeByMinimum = freeShippingMin != null && afterDiscount >= freeShippingMin;
  const baseShipping = shippingChoice ? shippingChoice.price : shippingFee;
  const shipping = freeShippingByCoupon || freeByMinimum ? 0 : round2(baseShipping);
  if (shippingChoice) deliveryDays = Math.max(deliveryDays, shippingChoice.days);

  return {
    lines,
    subtotal,
    discount,
    shipping,
    total: round2(afterDiscount + shipping),
    deliveryDays,
    couponCode: coupon?.code ?? null,
    shippingService: shippingChoice?.service ?? null,
  };
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

/**
 * Decides the order status after a Mercado Pago notification. A paid order is final:
 * it can only become "reembolsado", so a later rejected or cancelled attempt
 * (the customer tried to pay twice) never overwrites an approved payment.
 */
export function resolveOrderStatus(current: string, incoming: string): string {
  if (current === "pago") return incoming === "reembolsado" ? "reembolsado" : "pago";
  if (current === "reembolsado") return "reembolsado";
  return incoming;
}

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

export type FulfillmentStatus = "aguardando" | "separando" | "enviado" | "entregue" | "cancelado";

export const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  aguardando: "Aguardando envio",
  separando: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Envio cancelado",
};

/** Date (YYYY-MM-DD) that is `days` days after `from`. */
export function addDaysISO(from: Date, days: number): string {
  const d = new Date(from.getTime() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}
