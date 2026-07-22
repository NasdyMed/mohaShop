import { OrderStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { canTransition } from "@/lib/orders/status";

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
});
