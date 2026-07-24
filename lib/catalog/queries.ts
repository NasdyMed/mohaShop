import "server-only";

import { db } from "@/lib/db";

export type CatalogImage = { id: string; url: string; alt: string; color: string | null };
export type CatalogVariant = { id: string; sku: string; color: string; size: string; stock: number };
export type CatalogProductCard = {
  id: string;
  slug: string;
  name: string;
  priceDh: number;
  image: CatalogImage | null;
  images: CatalogImage[];
  variants: CatalogVariant[];
  available: boolean;
};
export type CatalogProductDetail = CatalogProductCard & {
  description: string;
  images: CatalogImage[];
};

export async function listVisibleProducts(): Promise<CatalogProductCard[]> {
  const products = await db.product.findMany({
    where: { isVisible: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      priceDh: true,
      images: { orderBy: { position: "asc" }, select: { id: true, url: true, alt: true, color: true } },
      variants: {
        orderBy: [{ color: "asc" }, { size: "asc" }],
        select: { id: true, sku: true, color: true, size: true, stock: true },
      },
    },
  });

  return products.map(({ images, variants, ...product }) => {
    const firstColor = variants.find((variant) => variant.stock > 0)?.color;
    return {
      ...product,
      image: images.find((image) => image.color === firstColor) ?? images.find((image) => image.color === null) ?? images[0] ?? null,
      images,
      variants,
      available: variants.some((variant) => variant.stock > 0),
    };
  });
}

export async function getVisibleProduct(slug: string): Promise<CatalogProductDetail | null> {
  const product = await db.product.findFirst({
    where: { slug, isVisible: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      priceDh: true,
      images: { orderBy: { position: "asc" }, select: { id: true, url: true, alt: true, color: true } },
      variants: {
        orderBy: [{ color: "asc" }, { size: "asc" }],
        select: { id: true, sku: true, color: true, size: true, stock: true },
      },
    },
  });

  if (!product) return null;
  const firstColor = product.variants.find((variant) => variant.stock > 0)?.color;
  return {
    ...product,
    image: product.images.find((image) => image.color === firstColor) ?? product.images.find((image) => image.color === null) ?? product.images[0] ?? null,
    available: product.variants.some((variant) => variant.stock > 0),
  };
}
