import { OrderStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { allowedTransitions, canTransition, orderStatusLabels } from "@/lib/orders/status";

describe("canTransition", () => {
  const statuses = Object.values(OrderStatus);
  const allowed = new Set([
    `${OrderStatus.NEW}:${OrderStatus.CONFIRMED}`,
    `${OrderStatus.NEW}:${OrderStatus.CANCELLED}`,
    `${OrderStatus.CONFIRMED}:${OrderStatus.SHIPPED}`,
    `${OrderStatus.CONFIRMED}:${OrderStatus.CANCELLED}`,
    `${OrderStatus.SHIPPED}:${OrderStatus.DELIVERED}`,
    `${OrderStatus.SHIPPED}:${OrderStatus.CANCELLED}`,
  ]);
  const cases = statuses.flatMap((from) =>
    statuses.map((to) => [from, to, allowed.has(`${from}:${to}`)] as const),
  );

  it.each(cases)("reports %s -> %s as %s", (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
  });

  it("exposes the French label and allowed targets from the same transition source", () => {
    expect(orderStatusLabels[OrderStatus.SHIPPED]).toBe("Expédiée");
    expect(allowedTransitions(OrderStatus.CONFIRMED)).toEqual([
      OrderStatus.SHIPPED,
      OrderStatus.CANCELLED,
    ]);
    expect(allowedTransitions(OrderStatus.DELIVERED)).toEqual([]);
  });
});
