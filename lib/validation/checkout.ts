import { z } from "zod";

const MOROCCAN_MOBILE = /^\+212[67]\d{8}$/;

function compactStructuredPhone(phone: string): string | null {
  const trimmed = phone.trim().replace(/\u00a0/g, " ");
  if (!/^[+\d .-]+$/.test(trimmed)) return null;
  if (/^\+[ .-]/.test(trimmed)) return null;

  const separators = [...trimmed].filter((character) => /[ .-]/.test(character));
  if (new Set(separators).size > 1) return null;
  if (separators.length > 0 && trimmed.split(separators[0]).some((part) => part.length === 0)) {
    return null;
  }

  const compact = separators.length > 0 ? trimmed.split(separators[0]).join("") : trimmed;
  if (/^0[67]\d{8}$/.test(compact)) return `+212${compact.slice(1)}`;
  if (MOROCCAN_MOBILE.test(compact)) return compact;
  return null;
}

export function normalizeMoroccanPhone(phone: string): string {
  return compactStructuredPhone(phone) ?? phone.trim();
}

export function validMoroccanPhone(phone: string): boolean {
  return compactStructuredPhone(phone) !== null;
}

const normalizedText = (minimum: number, maximum: number, field: string) =>
  z
    .string({ error: `${field} est requis.` })
    .refine(
      (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value),
      `${field} contient des caractères non autorisés.`,
    )
    .transform((value) => value.trim().replace(/[ \t\r\n\u00a0]+/gu, " "))
    .pipe(
      z
        .string()
        .min(minimum, `${field} doit contenir au moins ${minimum} caractères.`)
        .max(maximum, `${field} ne peut pas dépasser ${maximum} caractères.`),
    );

const frenchStrictError = { error: "Champ non reconnu." } as const;
const checkoutItemSchema = z.strictObject({
  variantId: z
    .string({ error: "La référence de l’article est requise." })
    .trim()
    .min(1, "La référence de l’article est requise.")
    .max(128, "La référence de l’article est trop longue."),
  quantity: z
    .number({ error: "La quantité doit être un nombre." })
    .int("La quantité doit être un nombre entier.")
    .safe("La quantité est invalide.")
    .min(1, "La quantité doit être au moins 1.")
    .max(20, "La quantité ne peut pas dépasser 20."),
}, frenchStrictError);

export const checkoutSchema = z
  .strictObject({
    firstName: normalizedText(2, 80, "Le prénom"),
    lastName: normalizedText(2, 80, "Le nom"),
    address: normalizedText(10, 300, "L’adresse"),
    city: normalizedText(2, 100, "La ville"),
    locale: z.enum(["fr", "ar"]).optional(),
    items: z
      .array(checkoutItemSchema, { error: "Le panier doit contenir des articles." })
      .min(1, "Le panier doit contenir au moins un article.")
      .max(30, "Le panier ne peut pas contenir plus de 30 articles."),
  }, frenchStrictError)
  .superRefine(({ items }, context) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.variantId)) {
        context.addIssue({
          code: "custom",
          message: "Un même article ne peut pas apparaître plusieurs fois dans le panier.",
          path: ["items", index, "variantId"],
        });
      }
      seen.add(item.variantId);
    });
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutDetails = z.output<typeof checkoutSchema>;
