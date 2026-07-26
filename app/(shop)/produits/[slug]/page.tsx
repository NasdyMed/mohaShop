import { ProductPageView } from "@/components/shop/product-page";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: { canonical: `/produits/${slug}`, languages: { fr: `/produits/${slug}`, ar: `/ar/produits/${slug}` } } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductPageView slug={slug} />;
}
