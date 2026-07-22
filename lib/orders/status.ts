import { OrderStatus } from "@prisma/client";

const transitions: Record<OrderStatus, ReadonlySet<OrderStatus>> = {
  [OrderStatus.NEW]: new Set([OrderStatus.CONFIRMED, OrderStatus.CANCELLED]),
  [OrderStatus.CONFIRMED]: new Set([OrderStatus.SHIPPED, OrderStatus.CANCELLED]),
  [OrderStatus.SHIPPED]: new Set([OrderStatus.DELIVERED, OrderStatus.CANCELLED]),
  [OrderStatus.DELIVERED]: new Set(),
  [OrderStatus.CANCELLED]: new Set(),
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  NEW: "Nouvelle", CONFIRMED: "Confirmée", SHIPPED: "Expédiée",
  DELIVERED: "Livrée", CANCELLED: "Annulée",
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from].has(to);
}

export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return [...transitions[from]];
}
