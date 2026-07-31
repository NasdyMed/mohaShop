import { describe, expect, it } from "vitest";

import { alternateLocalePath, isLocale, localeFromPath, localizePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("storefront i18n", () => {
  it("reconnaît uniquement les locales prises en charge", () => {
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("en")).toBe(false);
  });

  it("déduit la langue du document depuis la route sans localiser l'admin", () => {
    expect(localeFromPath("/ar/produits/atlas")).toBe("ar");
    expect(localeFromPath("/admin")).toBe("fr");
    expect(localeFromPath("/produits/atlas")).toBe("fr");
  });

  it("préfixe uniquement les routes publiques arabes", () => {
    expect(localizePath("/", "ar")).toBe("/ar");
    expect(localizePath("/produits/botte-atlas", "ar")).toBe("/ar/produits/botte-atlas");
    expect(localizePath("/panier", "fr")).toBe("/panier");
    expect(localizePath("/admin/produits", "ar")).toBe("/admin/produits");
    expect(localizePath("/api/auth", "ar")).toBe("/api/auth");
  });

  it("calcule la route équivalente dans l'autre langue", () => {
    expect(alternateLocalePath("/produits/botte-atlas", "fr")).toBe("/ar/produits/botte-atlas");
    expect(alternateLocalePath("/ar/panier", "ar")).toBe("/panier");
  });

  it("fournit des dictionnaires de même structure et traduit les valeurs métier", () => {
    const fr = getDictionary("fr");
    const ar = getDictionary("ar");

    expect(Object.keys(ar)).toEqual(Object.keys(fr));
    expect(ar.navigation.collection).toBe("المجموعة");
    expect(ar.colors.Noir).toBe("أسود");
    expect(ar.stock.outOfStock).toBe("نفد المخزون");
    expect(fr.checkout.submit).toBe("Confirmer la commande");
    expect(fr.product.orderNow).toBe("Commander maintenant");
    expect(fr.product.redirecting).toBe("Redirection…");
    expect(ar.product.orderNow).toBe("اطلب الآن");
    expect(ar.product.redirecting).toBe("جارٍ الانتقال…");
  });
});
