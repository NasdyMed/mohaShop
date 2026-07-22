import "server-only";

import { db } from "@/lib/db";

export type CatalogImage = { id: string; url: string; alt: string };
export type CatalogVariant = { id: string; sku: string; color: string; size: string; stock: number };
export type CatalogProductCard = {
  id: string;
  slug: string;
  name: string;
  priceDh: number;
  image: CatalogImage | null;
  available: boolean;
};
export type CatalogProductDetail = CatalogProductCard & {
  description: string;
  images: CatalogImage[];
  variants: CatalogVariant[];
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
      images: { orderBy: { position: "asc" }, take: 1, select: { id: true, url: true, alt: true } },
      variants: { where: { stock: { gt: 0 } }, take: 1, select: { id: true } },
    },
  });

  return products.map(({ images, variants, ...product }) => ({
    ...product,
    image: images[0] ?? null,
    available: variants.length > 0,
  }));
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
      images: { orderBy: { position: "asc" }, select: { id: true, url: true, alt: true } },
      variants: {
        orderBy: [{ color: "asc" }, { size: "asc" }],
        select: { id: true, sku: true, color: true, size: true, stock: true },
      },
    },
  });

  if (!product) return null;
  return {
    ...product,
    image: product.images[0] ?? null,
    available: product.variants.some((variant) => variant.stock > 0),
  };
}
