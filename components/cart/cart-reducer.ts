import type { CartAction, CartItem } from "./cart-types";

function positiveInteger(value: number) {
  return Number.isFinite(value) ? Math.floor(value) : 0;
}

function retainValidStock(items: readonly CartItem[]) {
  return items.filter((item) => positiveInteger(item.availableStock) > 0);
}

export function cartReducer(state: readonly CartItem[], action: CartAction): CartItem[] {
  const validState = retainValidStock(state);

  switch (action.type) {
    case "hydrate":
      return retainValidStock(action.items).map((item) => ({ ...item }));
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
