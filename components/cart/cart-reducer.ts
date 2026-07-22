import type { CartAction, CartItem } from "./cart-types";

function positiveInteger(value: number) {
  return Number.isFinite(value) ? Math.floor(value) : 0;
}

function retainValidStock(items: readonly CartItem[]) {
  return items.filter((item) => positiveInteger(item.availableStock) > 0);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate): CartItem[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Record<string, unknown>;
    if (!nonEmptyString(item.variantId)
      || !nonEmptyString(item.productSlug)
      || !nonEmptyString(item.productName)
      || !nonEmptyString(item.size)
      || !nonEmptyString(item.color)
      || (item.imageUrl !== null && typeof item.imageUrl !== "string")
      || !Number.isInteger(item.unitPriceDh) || (item.unitPriceDh as number) <= 0
      || !Number.isInteger(item.availableStock) || (item.availableStock as number) <= 0
      || !Number.isInteger(item.quantity) || (item.quantity as number) <= 0) return [];

    return [{
      variantId: item.variantId,
      productSlug: item.productSlug,
      productName: item.productName,
      imageUrl: item.imageUrl as string | null,
      size: item.size,
      color: item.color,
      unitPriceDh: item.unitPriceDh as number,
      availableStock: item.availableStock as number,
      quantity: Math.min(item.quantity as number, item.availableStock as number),
    }];
  });
}

export function cartReducer(state: readonly CartItem[], action: CartAction): CartItem[] {
  const validState = retainValidStock(state);

  switch (action.type) {
    case "hydrate":
      return sanitizeCartItems(action.items);
    case "add": { 
      const stock = positiveInteger(action.item.availableStock);
      const requested = positiveInteger(action.quantity);
      if (stock < 1 || requested < 1) return [...validState];

      const index = validState.findIndex((item) => item.variantId === action.item.variantId);
      if (index === -1) {
        return [...validState, { ...action.item, availableStock: stock, quantity: Math.min(requested, stock) }];
      }

      return validState.map((item, itemIndex) => itemIndex === index
        ? { ...action.item, availableStock: stock, quantity: Math.min(item.quantity + requested, stock) }
        : item);
    }
    case "setQuantity": {
      const requested = positiveInteger(action.quantity);
      return validState.map((item) => item.variantId === action.variantId
        ? { ...item, quantity: Math.min(Math.max(requested, 1), positiveInteger(item.availableStock)) }
        : item);
    }
    case "remove":
      return validState.filter((item) => item.variantId !== action.variantId);
    case "clear":
      return [];
  }
}

export function selectTotal(state: readonly CartItem[]) {
  return state.reduce((total, item) => total + item.unitPriceDh * item.quantity, 0);
}

export function selectItemCount(state: readonly CartItem[]) {
  return state.reduce((total, item) => total + item.quantity, 0);
}
