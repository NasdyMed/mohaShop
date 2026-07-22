import Link from "next/link";
import { CartLink } from "@/components/cart/cart-link";
import { CartView } from "@/components/cart/cart-view";

export default function CartPage() {
  return <main><header className="site-header shell"><Link className="brand" href="/">Maison Botte</Link><nav className="header-nav" aria-label="Navigation principale"><Link href="/">← Collection</Link><CartLink /></nav></header><div className="shell cart-page"><CartView /></div></main>;
}
