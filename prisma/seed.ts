import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(12),
});

const env = envSchema.parse(process.env);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

const products = [
  {
    slug: "bottine-atlas-cognac",
    name: "Bottine Atlas",
    description: "Une bottine en cuir cognac aux lignes sobres, pensée pour le quotidien.",
    priceDh: 1290,
    imageId: "demo-image-bottine-atlas-cognac",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    variants: [
      { sku: "ATLAS-COGNAC-40", size: "40", color: "Cognac", stock: 8 },
      { sku: "ATLAS-COGNAC-41", size: "41", color: "Cognac", stock: 10 },
      { sku: "ATLAS-COGNAC-42", size: "42", color: "Cognac", stock: 7 },
    ],
  },
  {
    slug: "chelsea-nocturne-noir",
    name: "Chelsea Nocturne",
    description: "Une Chelsea noire élégante, avec une silhouette nette et intemporelle.",
    priceDh: 1450,
    imageId: "demo-image-chelsea-nocturne-noir",
    image: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=1200&q=80",
    variants: [
      { sku: "NOCTURNE-NOIR-39", size: "39", color: "Noir", stock: 6 },
      { sku: "NOCTURNE-NOIR-40", size: "40", color: "Noir", stock: 9 },
      { sku: "NOCTURNE-NOIR-41", size: "41", color: "Noir", stock: 8 },
    ],
  },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  await prisma.admin.upsert({
    where: { email: env.ADMIN_EMAIL.toLowerCase() },
    update: { passwordHash },
    create: { email: env.ADMIN_EMAIL.toLowerCase(), passwordHash },
  });

  for (const demo of products) {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.upsert({
        where: { slug: demo.slug },
        update: {
          name: demo.name,
          description: demo.description,
          priceDh: demo.priceDh,
          isVisible: true,
        },
        create: {
          slug: demo.slug,
          name: demo.name,
          description: demo.description,
          priceDh: demo.priceDh,
          isVisible: true,
        },
      });

      await tx.productImage.upsert({
        where: { id: demo.imageId },
        update: { productId: product.id, url: demo.image, alt: demo.name, position: 0 },
        create: { id: demo.imageId, productId: product.id, url: demo.image, alt: demo.name, position: 0 },
      });

      for (const variant of demo.variants) {
        await tx.productVariant.upsert({
          where: { sku: variant.sku },
          update: { productId: product.id, size: variant.size, color: variant.color },
          create: { productId: product.id, ...variant },
        });
      }
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
