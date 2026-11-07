import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getShopProduct, MAX_QTY_PER_ITEM, SHIPPING_FEE } from "@/lib/catalog";
import type { CartLine } from "@/lib/checkout";

const STORAGE_KEY = "ciacap-cart";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  total: number;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        setLines(parsed.filter((l) => getShopProduct(l.id) && l.qty > 0));
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

  const add = useCallback(
    (id: string, qty = 1) => {
      setLines((prev) => {
        const current = prev.find((l) => l.id === id)?.qty ?? 0;
        const next = Math.min(current + qty, MAX_QTY_PER_ITEM);
        return prev.some((l) => l.id === id)
          ? prev.map((l) => (l.id === id ? { ...l, qty: next } : l))
          : [...prev, { id, qty: next }];
      });
    },
    [],
  );

  const remove = useCallback((id: string) => setLines((prev) => prev.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + (getShopProduct(l.id)?.price ?? 0) * l.qty, 0);
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal,
      total: lines.length ? subtotal + SHIPPING_FEE : 0,
      add,
      setQty,
      remove,
      clear,
    };
  }, [lines, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
