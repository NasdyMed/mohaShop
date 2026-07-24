import { describe, expect, it } from "vitest";

import { formatPriceDh } from "@/lib/catalog/price";

describe("formatPriceDh", () => {
  it("formats Moroccan prices from a server-safe module", () => {
    expect(formatPriceDh(1290)).toBe("1.290 DH");
  });
});
