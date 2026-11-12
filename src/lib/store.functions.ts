import { createServerFn } from "@tanstack/react-start";

import { loadCatalog, publicClient } from "@/lib/store.server";

type Storefront = Awaited<ReturnType<typeof loadCatalog>>;

// The catalog is public and signing the photos costs a round trip to Supabase, so each server
// instance keeps the last answer for a minute. Checkout never uses this cache: prices, stock and
// coupons are always recalculated from the database on payment.
const STOREFRONT_TTL_MS = 60_000;
let cached: { at: number; value: Storefront } | null = null;

/** Public storefront: active plans, products, affiliate links and shipping rules. */
export const getStorefront = createServerFn({ method: "GET" }).handler(async () => {
  if (cached && Date.now() - cached.at < STOREFRONT_TTL_MS) return cached.value;
  const value = await loadCatalog(publicClient(), { withImages: true });
  cached = { at: Date.now(), value };
  return value;
});
