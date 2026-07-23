"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";

import { cartReducer, sanitizeCartItems, selectItemCount, selectTotal } from "./cart-reducer";
import type { CartAction, CartItem } from "./cart-types";
import { CartFeedback } from "./cart-feedback";

const STORAGE_KEY = "boots-cart-v1";

type CartContextValue = {
  items: CartItem[];
  dispatch: React.Dispatch<CartAction>;
  hydrated: boolean;
  itemCount: number;
  totalDh: number;
  notice: { id: number; message: string } | null;
  clearNotice: () => void;
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

function readStoredCart(): CartItem[] {
  try {
    return parseStoredCart(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [{ items, hydrated }, reducerDispatch] = useReducer(
    (state: { items: CartItem[]; hydrated: boolean }, action: CartAction) => ({
      items: cartReducer(state.items, action),
      hydrated: state.hydrated || action.type === "hydrate",
    }),
    { items: [], hydrated: false },
  );
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  const clearNotice = useCallback(() => setNotice(null), []);
  const dispatch = useCallback<React.Dispatch<CartAction>>((action) => {
    reducerDispatch(action);
    if (action.type === "add") {
      const quantity = Math.max(1, action.quantity);
      setNotice({
        id: Date.now(),
        message: `${action.item.productName} a été ajouté au panier${quantity > 1 ? ` · ${quantity} articles` : ""}.`,
      });
    }
  }, []);

  useEffect(() => {
    reducerDispatch({ type: "hydrate", items: readStoredCart() });
  }, [reducerDispatch]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Persistence is best-effort; the in-memory cart remains usable.
    }
  }, [hydrated, items]);

  const value = useMemo(() => ({
    items,
    dispatch,
    hydrated,
    itemCount: selectItemCount(items),
    totalDh: selectTotal(items),
    notice,
    clearNotice,
  }), [clearNotice, dispatch, hydrated, items, notice]);

  return <CartContext.Provider value={value}>{children}<CartFeedback clearNotice={clearNotice} hydrated={hydrated} itemCount={value.itemCount} notice={notice} /></CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart doit être utilisé dans CartProvider");
  return context;
}
