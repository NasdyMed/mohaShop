import { notFound } from "next/navigation";

import { ProductDetailExperience } from "@/components/shop/product-detail-experience";
import { getVisibleProduct } from "@/lib/catalog/queries";
import type { Locale } from "@/lib/i18n/config";

export async function ProductPageView({ locale, slug }: { locale: Locale; slug: string }) {
  const product = await getVisibleProduct(slug);
  if (!product) notFound();
  return <main><ProductDetailExperience product={product}/></main>;
}
