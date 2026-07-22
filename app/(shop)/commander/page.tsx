import Link from "next/link";
import { CartLink } from "@/components/cart/cart-link";
import { CheckoutForm } from "@/components/cart/checkout-form";

export default function CheckoutPage() {
  return <main><header className="site-header shell"><Link className="brand" href="/">Maison Botte</Link><nav className="header-nav" aria-label="Navigation principale"><Link href="/panier">← Panier</Link><CartLink /></nav></header><div className="shell checkout-page"><CheckoutForm /></div></main>;
}
