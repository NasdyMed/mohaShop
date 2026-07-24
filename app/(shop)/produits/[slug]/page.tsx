import Link from "next/link";
import { notFound } from "next/navigation";
import { CartLink } from "@/components/cart/cart-link";
import { ProductDetailExperience } from "@/components/shop/product-detail-experience";
import { getVisibleProduct } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getVisibleProduct(slug);
  if (!product) notFound();
  return <main>
    <header className="site-header shell"><Link className="brand" href="/">Maison Botte</Link><nav className="header-nav" aria-label="Navigation principale"><Link href="/">← Collection</Link><CartLink /></nav></header>
    <ProductDetailExperience product={product}/>
  </main>;
}
