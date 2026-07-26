"use client";

import { createContext, useContext } from "react";

import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

const LocaleContext = createContext<Locale>("fr");

export function LocaleProvider({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useStorefrontI18n() {
  const locale = useContext(LocaleContext);
  return { locale, dictionary: getDictionary(locale) };
}
