import { readSecret } from "@/lib/credentials.server";

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  days: number;
}

export interface ShippingItem {
  id: string;
  qty: number;
  price: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

// Melhor Envio company ids: 1 = Correios, 2 = Jadlog.
const ALLOWED_COMPANIES = new Set([1, 2]);

interface MeQuote {
  id: number;
  name: string;
  price?: string;
  custom_price?: string;
  delivery_time?: number;
  custom_delivery_time?: number;
  error?: string;
  company?: { id: number; name: string };
}

/** Quotes Correios and Jadlog through Melhor Envio. Returns null when shipping quotes aren't configured. */
export async function quoteShipping(
  toCep: string,
  items: ShippingItem[],
): Promise<ShippingOption[] | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin
    .from("store_settings")
    .select("origin_cep, handling_days, shipping_sandbox")
    .maybeSingle();
  const token = await readSecret("melhorenvio_token");
  if (!token || !settings?.origin_cep) return null;

  const base = settings.shipping_sandbox
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";
  const res = await fetch(`${base}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": `Cia Cap (${process.env["SHIPPING_CONTACT_EMAIL"] ?? "contato@ciacap.com.br"})`,
    },
    body: JSON.stringify({
      from: { postal_code: settings.origin_cep },
      to: { postal_code: toCep },
      products: items.map((i) => ({
        id: i.id,
        width: i.widthCm,
        height: i.heightCm,
        length: i.lengthCm,
        weight: i.weightKg,
        insurance_value: i.price,
        quantity: i.qty,
      })),
    }),
  });
  if (!res.ok) {
    console.error(`Melhor Envio quote failed [${res.status}]: ${await res.text()}`);
    throw new Error("Shipping quote failed");
  }
  const quotes = (await res.json()) as MeQuote[];
  const handling = settings.handling_days ?? 0;
  return quotes
    .filter(
      (q) =>
        !q.error && q.company && ALLOWED_COMPANIES.has(q.company.id) && (q.custom_price ?? q.price),
    )
    .map((q) => ({
      id: String(q.id),
      name: `${q.company!.name} ${q.name}`,
      price: Math.round(Number(q.custom_price ?? q.price) * 100) / 100,
      days: (q.custom_delivery_time ?? q.delivery_time ?? 0) + handling,
    }))
    .sort((a, b) => a.price - b.price);
}
