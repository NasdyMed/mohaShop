import type { Metadata } from "next";
import { ProductPageView } from "@/components/shop/product-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: { canonical: `/ar/produits/${slug}`, languages: { fr: `/produits/${slug}`, ar: `/ar/produits/${slug}` } } };
}

export default async function ArabicProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductPageView locale="ar" slug={slug} />;
}
