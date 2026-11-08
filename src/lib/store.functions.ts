import { createServerFn } from "@tanstack/react-start";

import { loadCatalog, publicClient } from "@/lib/store.server";

/** Public storefront: active plans, products, affiliate links and shipping rules. */
export const getStorefront = createServerFn({ method: "GET" }).handler(async () =>
  loadCatalog(publicClient(), { withImages: true }),
);
