import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  PRODUCT_IMAGES_BUCKET,
  fallbackImage,
  type AffiliateProduct,
  type AffiliateStore,
  type Plan,
  type PlanId,
  type ProductCategory,
  type Storefront,
} from "@/lib/catalog";
import type { Coupon } from "@/lib/checkout";

type Client = SupabaseClient<Database>;

/** Read-only client with the publishable key, for public catalog reads during SSR. */
export function publicClient(): Client {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// Product photos and store settings are not readable by visitors directly; the server signs/reads them with the service client.
async function signImages(paths: string[]): Promise<Map<string, string>> {
  const { supabaseAdmin: client } = await import("@/integrations/supabase/client.server");
  const unique = [...new Set(paths.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data, error } = await client.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUrls(unique, 60 * 60 * 24 * 7);
  if (error) {
    console.error("Signing product images failed", error);
    return map;
  }
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}

/** Active plans, products, affiliate links and shipping settings. */
export async function loadCatalog(
  client: Client,
  opts: { withImages: boolean },
): Promise<Storefront> {
  const [plans, products, affiliates, settings] = await Promise.all([
    client.from("plans").select("*").eq("active", true).order("sort_order"),
    client.from("products").select("*").eq("active", true).order("sort_order").order("name"),
    client
      .from("affiliate_products")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("name"),
    import("@/integrations/supabase/client.server").then(({ supabaseAdmin }) =>
      supabaseAdmin
        .from("store_settings")
        .select("shipping_fee, free_shipping_min, low_stock_alert")
        .maybeSingle(),
    ),
  ]);
  for (const r of [plans, products, affiliates, settings]) {
    if (r.error) {
      console.error("Catalog read failed", r.error);
      throw new Error("Não foi possível carregar a loja");
    }
  }

  const images = opts.withImages
    ? await signImages([
        ...(products.data ?? []).map((p) => p.image_url ?? ""),
        ...(affiliates.data ?? []).map((p) => p.image_url ?? ""),
      ])
    : new Map<string, string>();

  return {
    plans: (plans.data ?? []).map((p): Plan => ({
      id: p.id as PlanId,
      name: p.name,
      price: Number(p.price),
      tagline: p.tagline,
      features: p.features,
      highlight: p.highlight,
    })),
    products: (products.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category as ProductCategory,
      price: Number(p.price),
      promoPrice: p.promo_price == null ? null : Number(p.promo_price),
      promoUntil: p.promo_until,
      stock: p.stock,
      deliveryDays: p.delivery_days,
      image:
        (p.image_url && images.get(p.image_url)) ||
        fallbackImage(p.id, p.category as ProductCategory),
      badge: p.badge,
    })),
    affiliates: (affiliates.data ?? [])
      .filter((p) => !!p.url && p.url !== "#")
      .map((p): AffiliateProduct => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category as ProductCategory,
        store: p.store as AffiliateStore,
        url: p.url,
        image:
          (p.image_url && images.get(p.image_url)) ||
          fallbackImage(p.id, p.category as ProductCategory),
        badge: p.badge,
      })),
    settings: {
      shippingFee: Number(settings.data?.shipping_fee ?? 0),
      freeShippingMin:
        settings.data?.free_shipping_min == null ? null : Number(settings.data.free_shipping_min),
      lowStockAlert: settings.data?.low_stock_alert ?? 5,
    },
  };
}

export async function loadCoupon(client: Client, code: string): Promise<Coupon | null> {
  const { data } = await client
    .from("coupons")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!data) return null;
  return {
    code: data.code,
    kind: data.kind as Coupon["kind"],
    value: Number(data.value),
    min_order: Number(data.min_order),
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    max_uses: data.max_uses,
    used_count: data.used_count,
    active: data.active,
  };
}
