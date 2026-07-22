"use client";

import { createContext, useContext, useEffect, useMemo, useReducer } from "react";

import { cartReducer, sanitizeCartItems, selectItemCount, selectTotal } from "./cart-reducer";
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

function parseStoredCart(value: string | null): CartItem[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return sanitizeCartItems(parsed);
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
