import { describe, expect, it } from "vitest";

import { generateOrderNumber } from "@/lib/orders/order-number";

describe("generateOrderNumber", () => {
  it("returns exactly BOT- followed by ten uppercase alphanumeric characters", () => {
    expect(generateOrderNumber()).toMatch(/^BOT-[A-Z0-9]{10}$/);
  });

  it("produces practically unique values across a representative sample", () => {
    const numbers = Array.from({ length: 2_000 }, generateOrderNumber);
    expect(new Set(numbers)).toHaveLength(numbers.length);
  });
});
