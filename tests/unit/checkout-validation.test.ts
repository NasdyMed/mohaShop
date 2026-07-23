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
  email: "",
  address: "12 rue Atlas, Rabat",
  addressComplement: "",
  city: "Rabat",
  region: "Rabat-Salé-Kénitra",
  postalCode: "",
  country: "Maroc",
  deliveryNotes: "",
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
  it("returns normalized customer details and a canonical phone", () => {
    const parsed = checkoutSchema.parse({
      ...validCheckout,
      firstName: "  Amina   Zahra ",
      lastName: "  El-Mansouri  ",
      phone: " 06 12 34 56 78 ",
      address: "  12   rue Atlas,   Rabat  ",
    });

    expect(parsed).toEqual({
      ...validCheckout,
      firstName: "Amina Zahra",
      lastName: "El-Mansouri",
      phone: "+212612345678",
      address: "12 rue Atlas, Rabat",
      email: undefined,
      addressComplement: undefined,
      postalCode: undefined,
      deliveryNotes: undefined,
    });
    expect(parsed.phone).toMatch(/^\+212[67]\d{8}$/);
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

  it("rejects invalid phones and unexpected input fields with French errors", () => {
    const badPhone = checkoutSchema.safeParse({ ...validCheckout, phone: "+33612345678" });
    const unexpected = checkoutSchema.safeParse({ ...validCheckout, totalDh: 100 });

    expect(badPhone.success).toBe(false);
    if (!badPhone.success) expect(badPhone.error.issues[0]?.message).toMatch(/téléphone/i);
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

  it("validates and normalizes complete Moroccan delivery details", () => {
    const result = checkoutSchema.parse({
      ...validCheckout,
      email: " AMINA@EXAMPLE.COM ",
      addressComplement: "  Appartement 4, 2e étage ",
      postalCode: "10000",
      deliveryNotes: "  Appeler avant la livraison  ",
    });

    expect(result).toMatchObject({
      email: "amina@example.com",
      addressComplement: "Appartement 4, 2e étage",
      city: "Rabat",
      region: "Rabat-Salé-Kénitra",
      postalCode: "10000",
      country: "Maroc",
      deliveryNotes: "Appeler avant la livraison",
    });
  });

  it("requires city and region while keeping secondary delivery fields optional", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, city: "" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, region: "" }).success).toBe(false);
    expect(checkoutSchema.safeParse(validCheckout).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...validCheckout, email: "incorrect", postalCode: "12" }).success).toBe(false);
  });
});
