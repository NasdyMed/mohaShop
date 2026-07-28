import { z } from "zod";
import { MAX_IMAGES_PER_COLOR } from "@/lib/catalog/product-image-groups";
import { productColorOptions } from "@/lib/catalog/color-swatches";

const noControls = (value: string) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
const clean = (min: number, max: number, label: string) => z.string()
  .transform((value) => value.trim())
  .pipe(z.string().min(min, `${label} est trop court.`).max(max, `${label} est trop long.`).refine(noControls, `${label} contient des caractères interdits.`));
const optionalClean = (min: number, max: number, label: string) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "") || value == null ? null : value,
  clean(min, max, label).nullable(),
);

const imageSchema = z.object({
  id: z.string().cuid().optional(),
  url: z.string().trim().max(2048).url("URL d’image invalide.").refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password && !url.port && (url.hostname === "images.unsplash.com" || /^[^.]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname));
    } catch { return false; }
  }, "L’image doit utiliser un hébergeur autorisé en HTTPS."),
  alt: clean(2, 160, "Le texte alternatif"),
  color: clean(1, 60, "La couleur"),
  position: z.number().int().min(0).max(productColorOptions.length * MAX_IMAGES_PER_COLOR - 1),
}).strict();

const variantSchema = z.object({
  id: z.string().cuid().optional(),
  sku: z.string().transform((value) => value.trim().toUpperCase()).pipe(z.string().min(2).max(64).regex(/^[A-Z0-9][A-Z0-9._-]*$/, "SKU invalide.")),
  size: clean(1, 20, "La pointure"),
  color: clean(1, 60, "La couleur"),
  stock: z.number().safe().int().min(0).max(1_000_000),
}).strict();

export const productInputSchema = z.object({
  id: z.string().cuid().optional(),
  name: clean(2, 120, "Le nom"),
  nameAr: optionalClean(2, 120, "Le nom en arabe"),
  description: z.string().transform((value) => value.replace(/\r\n?/g, "\n").trim())
    .pipe(z.string().min(20, "La description est trop courte.").max(3000, "La description est trop longue.").refine(noControls, "La description contient des caractères interdits.")),
  descriptionAr: optionalClean(20, 3000, "La description en arabe"),
  priceDh: z.number().safe().int().min(1).max(1_000_000),
  slug: z.string().trim().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide."),
  isVisible: z.boolean(),
  images: z.array(imageSchema).max(productColorOptions.length * MAX_IMAGES_PER_COLOR),
  variants: z.array(variantSchema).max(100),
}).strict().superRefine((value, context) => {
  if (value.isVisible && value.images.length === 0) context.addIssue({ code: "custom", path: ["images"], message: "Ajoutez au moins une image avant de publier." });
  if (value.isVisible && value.variants.length === 0) context.addIssue({ code: "custom", path: ["variants"], message: "Ajoutez au moins une déclinaison avant de publier." });
  const positions = new Set<number>();
  const imageIds = new Set<string>();
  const imagesPerColor = new Map<string, number>();
  value.images.forEach((image, index) => {
    if (image.id) {
      if (imageIds.has(image.id)) context.addIssue({ code: "custom", path: ["images", index, "id"], message: "Cette image est dupliquée." });
      imageIds.add(image.id);
    }
    if (positions.has(image.position)) context.addIssue({ code: "custom", path: ["images", index, "position"], message: "Les positions des images doivent être uniques." });
    positions.add(image.position);
    const normalizedColor = image.color.trim().toLocaleLowerCase("fr");
    const colorCount = (imagesPerColor.get(normalizedColor) ?? 0) + 1;
    imagesPerColor.set(normalizedColor, colorCount);
    if (colorCount > MAX_IMAGES_PER_COLOR) context.addIssue({ code: "custom", path: ["images", index, "color"], message: "Maximum 6 images par couleur." });
    if (!value.variants.some((variant) => variant.color.trim().toLocaleLowerCase("fr") === normalizedColor)) {
      context.addIssue({ code: "custom", path: ["images", index, "color"], message: "Choisissez une couleur disponible pour ce produit." });
    }
  });
  const skus = new Set<string>();
  const combinations = new Set<string>();
  const variantIds = new Set<string>();
  value.variants.forEach((variant, index) => {
    if (variant.id) {
      if (variantIds.has(variant.id)) context.addIssue({ code: "custom", path: ["variants", index, "id"], message: "Cette déclinaison est dupliquée." });
      variantIds.add(variant.id);
    }
    if (skus.has(variant.sku)) context.addIssue({ code: "custom", path: ["variants", index, "sku"], message: "Chaque SKU doit être unique." });
    skus.add(variant.sku);
    const combination = `${variant.size.toLocaleLowerCase("fr")}\u0000${variant.color.toLocaleLowerCase("fr")}`;
    if (combinations.has(combination)) context.addIssue({ code: "custom", path: ["variants", index], message: "Cette pointure et cette couleur existent déjà." });
    combinations.add(combination);
  });
});

export type ProductInput = z.input<typeof productInputSchema>;
