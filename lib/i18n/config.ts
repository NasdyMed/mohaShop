export const locales = ["fr", "ar"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function localeFromPath(pathname: string): Locale {
  return pathname === "/ar" || pathname.startsWith("/ar/") ? "ar" : "fr";
}

function isPrivatePath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/api" || pathname.startsWith("/api/");
}

function withoutArabicPrefix(pathname: string) {
  if (pathname === "/ar") return "/";
  return pathname.startsWith("/ar/") ? pathname.slice(3) : pathname;
}

export function localizePath(pathname: string, locale: Locale) {
  const canonicalPath = withoutArabicPrefix(pathname);
  if (isPrivatePath(canonicalPath) || locale === "fr") return canonicalPath;
  return canonicalPath === "/" ? "/ar" : `/ar${canonicalPath}`;
}

export function alternateLocalePath(pathname: string, locale: Locale) {
  return localizePath(pathname, locale === "fr" ? "ar" : "fr");
}
