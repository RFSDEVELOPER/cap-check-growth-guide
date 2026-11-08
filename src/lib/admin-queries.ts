import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { fallbackImage, type ProductCategory } from "@/lib/catalog";

// Admin data is read straight from the database; row security only lets admins see it.

export type OrderRow = Tables<"orders">;
export type ProductRow = Tables<"products">;
export type AffiliateRow = Tables<"affiliate_products">;
export type CouponRow = Tables<"coupons">;
export type PlanRow = Tables<"plans">;
export type SubscriptionRow = Tables<"subscriptions">;
export type ProfileRow = Tables<"profiles">;
export type QuizRow = Tables<"quiz_results">;
export type SettingsRow = Tables<"store_settings">;

export const PRODUCT_IMAGES_BUCKET = "product-images";

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

async function signedImages(rows: { id: string; category: string; image_url: string | null }[]) {
  const paths = rows.map((r) => r.image_url).filter((p): p is string => !!p);
  const map = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).createSignedUrls(paths, 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  }
  return (r: { id: string; category: string; image_url: string | null }) =>
    (r.image_url && map.get(r.image_url)) || fallbackImage(r.id, r.category as ProductCategory);
}

export const adminOrdersQuery = queryOptions({
  queryKey: ["admin", "orders"],
  queryFn: async () =>
    must(await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500)) ?? [],
});

export const adminProductsQuery = queryOptions({
  queryKey: ["admin", "products"],
  queryFn: async () => {
    const rows = must(await supabase.from("products").select("*").order("sort_order").order("name")) ?? [];
    const img = await signedImages(rows);
    return rows.map((r) => ({ ...r, image: img(r) }));
  },
});

export const adminAffiliatesQuery = queryOptions({
  queryKey: ["admin", "affiliates"],
  queryFn: async () => {
    const rows = must(await supabase.from("affiliate_products").select("*").order("sort_order").order("name")) ?? [];
    const img = await signedImages(rows);
    return rows.map((r) => ({ ...r, image: img(r) }));
  },
});

export const adminCouponsQuery = queryOptions({
  queryKey: ["admin", "coupons"],
  queryFn: async () =>
    must(await supabase.from("coupons").select("*").order("created_at", { ascending: false })) ?? [],
});

export const adminPlansQuery = queryOptions({
  queryKey: ["admin", "plans"],
  queryFn: async () => must(await supabase.from("plans").select("*").order("sort_order")) ?? [],
});

export const adminSettingsQuery = queryOptions({
  queryKey: ["admin", "settings"],
  queryFn: async () => must(await supabase.from("store_settings").select("*").maybeSingle()),
});

export const adminSubscriptionsQuery = queryOptions({
  queryKey: ["admin", "subscriptions"],
  queryFn: async () =>
    must(await supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(500)) ??
    [],
});

export const adminCustomersQuery = queryOptions({
  queryKey: ["admin", "customers"],
  queryFn: async () => {
    const [profiles, quiz] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("quiz_results").select("*").order("created_at", { ascending: false }).limit(2000),
    ]);
    return { profiles: must(profiles) ?? [], quiz: must(quiz) ?? [] };
  },
});

export async function uploadProductImage(folder: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Envie uma imagem (JPG, PNG ou WebP)");
  if (file.size > 5 * 1024 * 1024) throw new Error("A imagem deve ter até 5 MB");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error("Não foi possível enviar a imagem");
  return path;
}

/** Turns "Shampoo Cia Cap 250 ml" into "shampoo-cia-cap-250-ml". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Accepts "59,90", "59.90" or "R$ 59,90". Returns null when empty. */
export function parseMoney(value: string): number | null {
  const clean = value.replace(/[^\d,.-]/g, "").trim();
  if (!clean) return null;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export const dateBR = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("pt-BR") : "—";

export const todayISO = () => new Date().toISOString().slice(0, 10);

export interface ShippingInfo {
  name?: string;
  phone?: string | null;
  email?: string | null;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string;
  state?: string;
}

export const shippingOf = (o: OrderRow) => (o.shipping ?? {}) as ShippingInfo;

export const isLate = (o: OrderRow, today = todayISO()) =>
  o.status === "pago" &&
  !["entregue", "cancelado"].includes(o.fulfillment_status) &&
  !!o.estimated_delivery &&
  o.estimated_delivery < today;
