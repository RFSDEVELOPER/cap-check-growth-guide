import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { effectivePrice, MAX_QTY_PER_ITEM, type ShopProduct } from "@/lib/catalog";
import type { CartLine } from "@/lib/checkout";
import { storefrontQuery } from "@/lib/storefront";

const STORAGE_KEY = "ciacap-cart";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  /** Estimate with current prices; the server re-prices with shipping and coupon at checkout. */
  subtotal: number;
  getProduct: (id: string) => ShopProduct | undefined;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { data: store } = useQuery(storefrontQuery);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        setLines(parsed.filter((l) => typeof l.id === "string" && l.qty > 0));
      }
    } catch {
      /* ignore broken storage */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, loaded]);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) => {
      const clamped = Math.min(Math.max(Math.floor(qty), 0), MAX_QTY_PER_ITEM);
      if (clamped === 0) return prev.filter((l) => l.id !== id);
      return prev.some((l) => l.id === id)
        ? prev.map((l) => (l.id === id ? { ...l, qty: clamped } : l))
        : [...prev, { id, qty: clamped }];
    });
  }, []);

  const add = useCallback((id: string, qty = 1) => {
    setLines((prev) => {
      const current = prev.find((l) => l.id === id)?.qty ?? 0;
      const next = Math.min(current + qty, MAX_QTY_PER_ITEM);
      return prev.some((l) => l.id === id)
        ? prev.map((l) => (l.id === id ? { ...l, qty: next } : l))
        : [...prev, { id, qty: next }];
    });
  }, []);

  const remove = useCallback(
    (id: string) => setLines((prev) => prev.filter((l) => l.id !== id)),
    [],
  );
  const clear = useCallback(() => setLines([]), []);

  // Drop products that were removed from the store.
  useEffect(() => {
    if (!store || !loaded) return;
    setLines((prev) => {
      const next = prev.filter((l) => store.products.some((p) => p.id === l.id));
      return next.length === prev.length ? prev : next;
    });
  }, [store, loaded]);

  const value = useMemo(() => {
    const getProduct = (id: string) => store?.products.find((p) => p.id === id);
    const subtotal = lines.reduce((s, l) => {
      const p = getProduct(l.id);
      return s + (p ? effectivePrice(p) : 0) * l.qty;
    }, 0);
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal,
      getProduct,
      add,
      setQty,
      remove,
      clear,
    };
  }, [lines, store, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
