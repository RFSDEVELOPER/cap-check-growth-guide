import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { getStorefront } from "@/lib/store.functions";

export const storefrontQuery = queryOptions({
  queryKey: ["storefront"],
  queryFn: () => getStorefront(),
  staleTime: 60_000,
});

export const useStorefront = () => useSuspenseQuery(storefrontQuery).data;
