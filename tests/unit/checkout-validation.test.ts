import { describe, expect, it } from "vitest";

import {
  checkoutSchema,
  normalizeMoroccanPhone,
  validMoroccanPhone,
} from "@/lib/validation/checkout";

const validCheckout = {
  firstName: "Amina",
  lastName: "El Mansouri",
  address: "12 rue Atlas, Rabat",
  city: "Rabat",
  items: [{ variantId: "variant-1", quantity: 2 }],
};

function issueAt(result: ReturnType<typeof checkoutSchema.safeParse>, path: PropertyKey[]) {
  if (result.success) return undefined;
  return result.error.issues.find((issue) =>
    issue.path.length === path.length && issue.path.every((part, index) => part === path[index]),
  );
}

describe("Moroccan phone validation", () => {
  it.each([
    ["0612345678", "+212612345678"],
    ["0712345678", "+212712345678"],
    ["+212612345678", "+212612345678"],
    ["+212712345678", "+212712345678"],
    [" 06 12 34 56 78 ", "+212612345678"],
    ["06-12-34-56-78", "+212612345678"],
    ["+2127.12.34.56.78", "+212712345678"],
    ["+212\u00a07\u00a012\u00a034\u00a056\u00a078", "+212712345678"],
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
    "00212612345678",
    "0(6)12345678",
    "+212(6)12345678",
    "06...12...34...56...78",
    "06-12.34-56.78",
    "-0612345678",
    "0612345678-",
    "06+12345678",
    "+ 212612345678",
  ])("rejects invalid phone %s", (phone) => {
    expect(validMoroccanPhone(phone)).toBe(false);
  });
});

describe("checkoutSchema", () => {
  it("accepts exactly the four requested customer fields", () => {
    const result = checkoutSchema.parse({
      firstName: "Amina",
      lastName: "El Idrissi",
      city: "Rabat",
      address: "12 avenue Mohammed V",
      items: [{ variantId: "variant-1", quantity: 1 }],
    });

    expect(result).toMatchObject({
      firstName: "Amina",
      lastName: "El Idrissi",
      city: "Rabat",
      address: "12 avenue Mohammed V",
    });
  });

  it("rejects removed delivery fields", () => {
    const result = checkoutSchema.safeParse({
      firstName: "Amina",
      lastName: "El Idrissi",
      city: "Rabat",
      address: "12 avenue Mohammed V",
      phone: "0612345678",
      items: [{ variantId: "variant-1", quantity: 1 }],
    });

    expect(result.success).toBe(false);
  });

  it("returns normalized customer delivery details", () => {
    const parsed = checkoutSchema.parse({
      ...validCheckout,
      firstName: "  Amina   Zahra ",
      lastName: "  El-Mansouri  ",
      address: "  12   rue Atlas,   Rabat  ",
    });

    expect(parsed).toEqual({
      ...validCheckout,
      firstName: "Amina Zahra",
      lastName: "El-Mansouri",
      address: "12 rue Atlas, Rabat",
    });
  });

  it.each(["Él", "O’Connor", "بناني", "Al-Amine"]) (
    "accepts inclusive customer name %s",
    (firstName) => {
      expect(checkoutSchema.safeParse({ ...validCheckout, firstName }).success).toBe(true);
    },
  );

  it.each([
    ["firstName", "Am\u0000ina", ["firstName"]],
    ["lastName", "El\u0000Mansouri", ["lastName"]],
    ["address", "12 rue\u0000 Atlas", ["address"]],
    ["firstName", "Am\u0007ina", ["firstName"]],
    ["lastName", "Mans\u0085ouri", ["lastName"]],
  ] as const)("rejects unsafe control content in %s", (field, value, path) => {
    const result = checkoutSchema.safeParse({ ...validCheckout, [field]: value });
    const issue = issueAt(result, [...path]);

    expect(result.success).toBe(false);
    expect(issue?.message).toMatch(/caractère|autorisé|invalide/i);
  });

  it("normalizes ordinary whitespace while preserving Arabic and accented names", () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      firstName: "  Élise\tZahra ",
      lastName: "  بناني\nالأمين  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Élise Zahra");
      expect(result.data.lastName).toBe("بناني الأمين");
    }
  });

  it("enforces normalized name and address boundaries", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, firstName: "A" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, firstName: "A".repeat(80) }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...validCheckout, firstName: "A".repeat(81) }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, lastName: "A" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, lastName: "A".repeat(80) }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...validCheckout, lastName: "A".repeat(81) }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, address: "A".repeat(9) }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, address: "A".repeat(10) }).success).toBe(true);
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
    expect(checkoutSchema.safeParse({
      ...validCheckout,
      items: Array.from({ length: 30 }, (_, index) => ({ variantId: `v-${index}`, quantity: 1 })),
    }).success).toBe(true);
    expect(oversized.success).toBe(false);
    if (!empty.success) expect(empty.error.issues[0]?.message).toMatch(/article|panier/i);
    if (!oversized.success) expect(oversized.error.issues[0]?.message).toMatch(/30|article|panier/i);
  });

  it("accepts the maximum quantity", () => {
    expect(checkoutSchema.safeParse({
      ...validCheckout,
      items: [{ variantId: "variant-1", quantity: 20 }],
    }).success).toBe(true);
  });

  it.each([
    0,
    -1,
    1.5,
    21,
    Number.MAX_SAFE_INTEGER + 1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("rejects invalid quantity %s", (quantity) => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      items: [{ variantId: "variant-1", quantity }],
    });
    expect(result.success).toBe(false);
    expect(issueAt(result, ["items", 0, "quantity"])?.message).toMatch(/quantité/i);
  });

  it("rejects blank and overly long variant identifiers", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, items: [{ variantId: "", quantity: 1 }] }).success).toBe(false);
    const whitespace = checkoutSchema.safeParse({
      ...validCheckout,
      items: [{ variantId: "   ", quantity: 1 }],
    });
    expect(issueAt(whitespace, ["items", 0, "variantId"])?.message).toMatch(/référence|article/i);
    expect(checkoutSchema.safeParse({ ...validCheckout, items: [{ variantId: "v".repeat(128), quantity: 1 }] }).success).toBe(true);
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

  it("detects duplicate variant identifiers after trimming", () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      items: [
        { variantId: "variant-1", quantity: 1 },
        { variantId: "  variant-1  ", quantity: 2 },
      ],
    });

    expect(issueAt(result, ["items", 1, "variantId"])?.message).toMatch(/plusieurs fois|doublon/i);
  });

  it.each([
    [{ quantity: 1 }, ["items", 0, "variantId"]],
    [{ variantId: 42, quantity: 1 }, ["items", 0, "variantId"]],
    [{ variantId: "variant-1" }, ["items", 0, "quantity"]],
    [{ variantId: "variant-1", quantity: "2" }, ["items", 0, "quantity"]],
  ] as const)("rejects missing or mistyped item fields", (item, path) => {
    const result = checkoutSchema.safeParse({ ...validCheckout, items: [item] });

    expect(result.success).toBe(false);
    expect(issueAt(result, [...path])?.message).toMatch(/requis|référence|quantité|nombre/i);
  });

  it("rejects unexpected input fields with French errors", () => {
    const unexpected = checkoutSchema.safeParse({ ...validCheckout, totalDh: 100 });

    expect(unexpected.success).toBe(false);
    if (!unexpected.success) expect(unexpected.error.issues[0]).toMatchObject({
      message: "Champ non reconnu.",
      path: [],
    });

    const unexpectedItem = checkoutSchema.safeParse({
      ...validCheckout,
      items: [{ variantId: "variant-1", quantity: 1, price: 100 }],
    });
    expect(unexpectedItem.success).toBe(false);
    if (!unexpectedItem.success) expect(unexpectedItem.error.issues[0]).toMatchObject({
      message: "Champ non reconnu.",
      path: ["items", 0],
    });
  });

  it("requires city", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, city: "" }).success).toBe(false);
    expect(checkoutSchema.safeParse(validCheckout).success).toBe(true);
  });
});
