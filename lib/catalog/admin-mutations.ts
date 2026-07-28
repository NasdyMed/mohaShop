import "server-only";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { ProductInput, productInputSchema } from "@/lib/validation/product";
import { mapUniqueConstraintTarget } from "@/lib/catalog/unique-constraint";
import { normalizeKnownProductColor } from "@/lib/catalog/color-swatches";

export type ProductMutationCode = "INVALID" | "INVALID_COLOR" | "NOT_FOUND" | "TAMPERED_VARIANT" | "DUPLICATE_SLUG" | "DUPLICATE_SKU" | "DUPLICATE_VARIANT" | "UNKNOWN";
export class ProductMutationError extends Error { constructor(public readonly code: ProductMutationCode, options?: ErrorOptions) { super(code, options); this.name = "ProductMutationError"; } }

function uniqueCode(error: unknown): ProductMutationCode | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return;
  return mapUniqueConstraintTarget(error.meta?.target);
}

export async function saveProduct(raw: ProductInput) {
  const parsed = productInputSchema.safeParse(raw);
  if (!parsed.success) throw new ProductMutationError("INVALID");
  const input = parsed.data;
  try {
    return await db.$transaction(async (tx) => {
      let id = input.id;
      let previousSlug: string | undefined;
      if (!id) {
        const product = await tx.product.create({ data: { name: input.name, nameAr: input.nameAr, description: input.description, descriptionAr: input.descriptionAr, priceDh: input.priceDh, compareAtPriceDh: input.compareAtPriceDh, slug: input.slug, isVisible: input.isVisible }, select: { id: true } });
        id = product.id;
      } else {
        const exists = await tx.product.findUnique({ where: { id }, select: { id: true, slug: true } });
        if (!exists) throw new ProductMutationError("NOT_FOUND");
        if (exists.slug !== input.slug) previousSlug = exists.slug;
        await tx.product.update({ where: { id }, data: { name: input.name, nameAr: input.nameAr, description: input.description, descriptionAr: input.descriptionAr, priceDh: input.priceDh, compareAtPriceDh: input.compareAtPriceDh, slug: input.slug, isVisible: input.isVisible } });
      }

      const existingVariants = await tx.productVariant.findMany({ where: { productId: id }, select: { id: true, color: true, _count: { select: { orderItems: true } } } });
      const existingIds = new Set(existingVariants.map((variant) => variant.id));
      const suppliedIds = new Set(input.variants.flatMap((variant) => variant.id ? [variant.id] : []));
      if ([...suppliedIds].some((variantId) => !existingIds.has(variantId))) throw new ProductMutationError("TAMPERED_VARIANT");
      const existingById = new Map(existingVariants.map((variant) => [variant.id, variant]));
      const preservedLegacyColors = new Map<string, string>();
      const variants = input.variants.map((variant) => {
        const known = normalizeKnownProductColor(variant.color);
        if (known) return { ...variant, color: known };
        const existing = variant.id ? existingById.get(variant.id) : undefined;
        const existingColor = existing?.color.trim();
        if (!existingColor || normalizeKnownProductColor(existingColor) ||
          existingColor.toLocaleLowerCase("fr") !== variant.color.trim().toLocaleLowerCase("fr")) {
          throw new ProductMutationError("INVALID_COLOR");
        }
        preservedLegacyColors.set(existingColor.toLocaleLowerCase("fr"), existingColor);
        return { ...variant, color: existingColor };
      });
      const images = input.images.map((image) => {
        const known = normalizeKnownProductColor(image.color);
        if (known) return { ...image, color: known };
        const legacy = preservedLegacyColors.get(image.color.trim().toLocaleLowerCase("fr"));
        if (!legacy) throw new ProductMutationError("INVALID_COLOR");
        return { ...image, color: legacy };
      });
      for (const variant of existingVariants) {
        if (suppliedIds.has(variant.id)) {
          const nonce = randomUUID();
          await tx.productVariant.update({ where: { id: variant.id }, data: { sku: `TMP-${nonce}`, size: `TMP-${nonce}`, color: `TMP-${nonce}` } });
        } else if (variant._count.orderItems > 0) await tx.productVariant.update({ where: { id: variant.id }, data: { stock: 0 } });
        else await tx.productVariant.delete({ where: { id: variant.id } });
      }
      for (const variant of variants) {
        const data = { sku: variant.sku, size: variant.size, color: variant.color, stock: variant.stock };
        if (variant.id) await tx.productVariant.update({ where: { id: variant.id }, data });
        else await tx.productVariant.create({ data: { ...data, productId: id } });
      }

      // Remote blob deletion is intentionally deferred: removing a DB image must not destructively delete its remote asset.
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (images.length) await tx.productImage.createMany({ data: images.map(({ url, alt, color, position }) => ({ productId: id!, url, alt, color, position })) });
      return { id, slug: input.slug, ...(previousSlug ? { previousSlug } : {}) };
    });
  } catch (error) {
    if (error instanceof ProductMutationError) throw error;
    const code = uniqueCode(error);
    if (code && code !== "UNKNOWN") throw new ProductMutationError(code, { cause: error });
    throw new ProductMutationError("UNKNOWN", { cause: error });
  }
}
