import { describe, expect, it } from "vitest";

import {
  checkoutSchema,
  normalizeMoroccanPhone,
  validMoroccanPhone,
} from "@/lib/validation/checkout";

const validCheckout = {
  firstName: "Amina",
  lastName: "El Mansouri",
  phone: "0612345678",
  address: "12 rue Atlas, Rabat",
  items: [{ variantId: "variant-1", quantity: 2 }],
};

describe("Moroccan phone validation", () => {
  it.each([
    ["0612345678", "+212612345678"],
    ["0712345678", "+212712345678"],
    ["+212612345678", "+212612345678"],
    ["+212712345678", "+212712345678"],
    ["00212612345678", "+212612345678"],
    [" 06 12-34.56 78 ", "+212612345678"],
    ["+212\u00a07 (12) 34-56.78", "+212712345678"],
  ])("normalizes %s to %s", (input, canonical) => {
    expect(normalizeMoroccanPhone(input)).toBe(canonical);
    expect(validMoroccanPhone(input)).toBe(true);
  });

  it.each([
    "0512345678",
    "061234567",
    "06123456789",
    "+33612345678",
    "06ABC45678",
    "++212612345678",
    "+2120612345678",
  ])("rejects invalid phone %s", (phone) => {
    expect(validMoroccanPhone(phone)).toBe(false);
  });
});

describe("checkoutSchema", () => {
  it("returns normalized customer details and a canonical phone", () => {
    const parsed = checkoutSchema.parse({
      ...validCheckout,
      firstName: "  Amina   Zahra ",
      lastName: "  El-Mansouri  ",
      phone: " 06 12-34.56.78 ",
      address: "  12   rue Atlas,   Rabat  ",
    });

    expect(parsed).toEqual({
      ...validCheckout,
      firstName: "Amina Zahra",
      lastName: "El-Mansouri",
      phone: "+212612345678",
      address: "12 rue Atlas, Rabat",
    });
    expect(parsed.phone).toMatch(/^\+212[67]\d{8}$/);
  });

  it.each(["Él", "O’Connor", "بناني", "Al-Amine"]) (
    "accepts inclusive customer name %s",
    (firstName) => {
      expect(checkoutSchema.safeParse({ ...validCheckout, firstName }).success).toBe(true);
    },
  );

  it("enforces normalized name and address boundaries", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, firstName: "A" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, firstName: "A".repeat(80) }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...validCheckout, firstName: "A".repeat(81) }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, address: "A".repeat(9) }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, address: "A".repeat(300) }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...validCheckout, address: "A".repeat(301) }).success).toBe(false);
  });

  it("rejects empty and oversized carts with French errors", () => {
    const empty = checkoutSchema.safeParse({ ...validCheckout, items: [] });
    const oversized = checkoutSchema.safeParse({
      ...validCheckout,
      items: Array.from({ length: 31 }, (_, index) => ({ variantId: `v-${index}`, quantity: 1 })),
    });

    expect(empty.success).toBe(false);
    expect(oversized.success).toBe(false);
    if (!empty.success) expect(empty.error.issues[0]?.message).toMatch(/article|panier/i);
    if (!oversized.success) expect(oversized.error.issues[0]?.message).toMatch(/30|article|panier/i);
  });

  it.each([0, 1.5, 21])("rejects invalid quantity %s", (quantity) => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      items: [{ variantId: "variant-1", quantity }],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toMatch(/quantité/i);
  });

  it("rejects blank and overly long variant identifiers", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, items: [{ variantId: "", quantity: 1 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, items: [{ variantId: "v".repeat(129), quantity: 1 }] }).success).toBe(false);
  });

  it("rejects duplicate variant identifiers with a French error", () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      items: [
        { variantId: "variant-1", quantity: 1 },
        { variantId: "variant-1", quantity: 2 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toMatch(/doublon|plusieurs fois/i);
  });

  it("rejects invalid phones and unexpected input fields with French errors", () => {
    const badPhone = checkoutSchema.safeParse({ ...validCheckout, phone: "+33612345678" });
    const unexpected = checkoutSchema.safeParse({ ...validCheckout, email: "amina@example.com" });

    expect(badPhone.success).toBe(false);
    if (!badPhone.success) expect(badPhone.error.issues[0]?.message).toMatch(/téléphone/i);
    expect(unexpected.success).toBe(false);
  });
});
