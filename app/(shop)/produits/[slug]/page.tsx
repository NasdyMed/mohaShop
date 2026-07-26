import { ProductPageView } from "@/components/shop/product-page";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductPageView locale="fr" slug={slug} />;
}
