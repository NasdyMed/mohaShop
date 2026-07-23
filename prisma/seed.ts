import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { seedProducts } from "./seed-products";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(12),
});

const env = envSchema.parse(process.env);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

async function main() {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  await prisma.admin.upsert({
    where: { email: env.ADMIN_EMAIL.toLowerCase() },
    update: { passwordHash },
    create: { email: env.ADMIN_EMAIL.toLowerCase(), passwordHash },
  });

  for (const demo of seedProducts) {
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
          where: {
            productId_size_color: {
              productId: product.id,
              size: variant.size,
              color: variant.color,
            },
          },
          update: { sku: variant.sku, stock: variant.stock },
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
