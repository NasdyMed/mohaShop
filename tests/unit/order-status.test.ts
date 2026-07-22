import { OrderStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { canTransition } from "@/lib/orders/status";

describe("canTransition", () => {
  it.each([
    [OrderStatus.NEW, OrderStatus.CONFIRMED],
    [OrderStatus.CONFIRMED, OrderStatus.SHIPPED],
    [OrderStatus.SHIPPED, OrderStatus.DELIVERED],
    [OrderStatus.NEW, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  ])("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    [OrderStatus.CANCELLED, OrderStatus.NEW],
    [OrderStatus.NEW, OrderStatus.DELIVERED],
  ])("rejects %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});
