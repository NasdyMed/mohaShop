import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { CartLink } from "@/components/cart/cart-link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizePath, type Locale } from "@/lib/i18n/config";
import { LanguageSwitcher } from "./language-switcher";
import { LocaleProvider } from "./locale-provider";

export function StorefrontShell({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const dictionary = getDictionary(locale);
  return (
    <LocaleProvider locale={locale}><div data-testid="storefront-locale" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className="site-header shell">
        <Link className="brand" href={localizePath("/", locale)}><BrandLogo /></Link>
        <nav className="header-nav" aria-label={locale === "ar" ? "التنقل الرئيسي" : "Navigation principale"}>
          <Link className="touch-link" href={localizePath("/#collection", locale)}>{dictionary.navigation.collection}</Link>
          <CartLink locale={locale} />
          <LanguageSwitcher locale={locale} />
        </nav>
      </header>
      {children}
    </div></LocaleProvider>
  );
}
