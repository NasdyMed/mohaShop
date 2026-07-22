import { z } from "zod";

const MOROCCAN_MOBILE = /^\+212[67]\d{8}$/;
const PHONE_CHARACTERS = /^[\d+ .\-()\u00a0]+$/;

export function normalizeMoroccanPhone(phone: string): string {
  const trimmed = phone.trim();
  if (!PHONE_CHARACTERS.test(trimmed)) return trimmed;

  const compact = trimmed.replace(/[ .\-()\u00a0]/g, "");
  if (/^0[67]\d{8}$/.test(compact)) return `+212${compact.slice(1)}`;
  if (/^00212[67]\d{8}$/.test(compact)) return `+${compact.slice(2)}`;
  return compact;
}

export function validMoroccanPhone(phone: string): boolean {
  return MOROCCAN_MOBILE.test(normalizeMoroccanPhone(phone));
}

const normalizedText = (minimum: number, maximum: number, field: string) =>
  z
    .string({ error: `${field} est requis.` })
    .transform((value) => value.trim().replace(/\s+/gu, " "))
    .pipe(
      z
        .string()
        .min(minimum, `${field} doit contenir au moins ${minimum} caractères.`)
        .max(maximum, `${field} ne peut pas dépasser ${maximum} caractères.`),
    );

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
});

export const checkoutSchema = z
  .strictObject({
    firstName: normalizedText(2, 80, "Le prénom"),
    lastName: normalizedText(2, 80, "Le nom"),
    phone: z
      .string({ error: "Le téléphone est requis." })
      .transform(normalizeMoroccanPhone)
      .pipe(z.string().regex(MOROCCAN_MOBILE, "Le numéro de téléphone marocain est invalide.")),
    address: normalizedText(10, 300, "L’adresse"),
    items: z
      .array(checkoutItemSchema, { error: "Le panier doit contenir des articles." })
      .min(1, "Le panier doit contenir au moins un article.")
      .max(30, "Le panier ne peut pas contenir plus de 30 articles."),
  })
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
