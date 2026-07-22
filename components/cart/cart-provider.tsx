"use client";

import { createContext, useContext, useEffect, useMemo, useReducer } from "react";

import { cartReducer, selectItemCount, selectTotal } from "./cart-reducer";
import type { CartAction, CartItem } from "./cart-types";

const STORAGE_KEY = "boots-cart-v1";

type CartContextValue = {
  items: CartItem[];
  dispatch: React.Dispatch<CartAction>;
  hydrated: boolean;
  itemCount: number;
  totalDh: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseStoredCart(value: string | null): CartItem[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((candidate): candidate is CartItem => {
      if (!candidate || typeof candidate !== "object") return false;
      const item = candidate as Record<string, unknown>;
      return nonEmptyString(item.variantId)
        && nonEmptyString(item.productSlug)
        && nonEmptyString(item.productName)
        && (item.imageUrl === null || typeof item.imageUrl === "string")
        && nonEmptyString(item.size)
        && nonEmptyString(item.color)
        && Number.isInteger(item.unitPriceDh) && (item.unitPriceDh as number) >= 0
        && Number.isInteger(item.availableStock) && (item.availableStock as number) > 0
        && Number.isInteger(item.quantity) && (item.quantity as number) > 0
        && (item.quantity as number) <= (item.availableStock as number);
    }).map((item) => ({ ...item }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [{ items, hydrated }, dispatch] = useReducer(
    (state: { items: CartItem[]; hydrated: boolean }, action: CartAction) => ({
      items: cartReducer(state.items, action),
      hydrated: state.hydrated || action.type === "hydrate",
    }),
    { items: [], hydrated: false },
  );

  useEffect(() => {
    dispatch({ type: "hydrate", items: parseStoredCart(window.localStorage.getItem(STORAGE_KEY)) });
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const value = useMemo(() => ({
    items,
    dispatch,
    hydrated,
    itemCount: selectItemCount(items),
    totalDh: selectTotal(items),
  }), [hydrated, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart doit être utilisé dans CartProvider");
  return context;
}
