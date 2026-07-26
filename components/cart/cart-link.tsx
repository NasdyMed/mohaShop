"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";
import { localizePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function CartLink({ locale = "fr" }: { locale?: Locale }) {
  const { hydrated, itemCount } = useCart();
  const label = getDictionary(locale).navigation.cart;
  return <Link className="touch-link" href={localizePath("/panier", locale)}>{label}{hydrated && itemCount > 0 ? ` (${itemCount})` : ""}</Link>;
}
