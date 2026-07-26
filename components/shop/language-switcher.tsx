"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { alternateLocalePath, type Locale } from "@/lib/i18n/config";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const selectLocale = (nextLocale: Locale) => {
    document.cookie = `storefront-locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  };

  return (
    <div className="language-switcher" aria-label={locale === "ar" ? "اختيار اللغة" : "Choisir la langue"}>
      <Link href={locale === "fr" ? pathname : alternateLocalePath(pathname, locale)} aria-label="Français" aria-current={locale === "fr" ? "page" : undefined} onClick={() => selectLocale("fr")}>
        <span aria-hidden="true">🇫🇷</span><span>FR</span>
      </Link>
      <Link href={locale === "ar" ? pathname : alternateLocalePath(pathname, locale)} aria-label="العربية" aria-current={locale === "ar" ? "page" : undefined} onClick={() => selectLocale("ar")}>
        <span aria-hidden="true">🇲🇦</span><span>AR</span>
      </Link>
    </div>
  );
}
