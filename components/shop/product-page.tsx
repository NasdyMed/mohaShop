import { notFound } from "next/navigation";

import { ProductDetailExperience } from "@/components/shop/product-detail-experience";
import { getVisibleProduct } from "@/lib/catalog/queries";

export async function ProductPageView({ slug }: { slug: string }) {
  const product = await getVisibleProduct(slug);
  if (!product) notFound();
  return <main><ProductDetailExperience product={product}/></main>;
}
