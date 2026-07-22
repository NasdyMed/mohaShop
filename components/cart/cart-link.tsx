"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

export function CartLink() {
  const { hydrated, itemCount } = useCart();
  return <Link href="/panier">Panier{hydrated && itemCount > 0 ? ` (${itemCount})` : ""}</Link>;
}
