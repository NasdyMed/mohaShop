import { describe, expect, it } from "vitest";

import { localizeProduct } from "@/lib/i18n/product";

const product = {
  name: "Botte Atlas",
  description: "Description française",
  nameAr: "حذاء أطلس",
  descriptionAr: "وصف عربي",
};

describe("localizeProduct", () => {
  it("utilise les champs arabes lorsqu'ils sont disponibles", () => {
    expect(localizeProduct(product, "ar")).toMatchObject({ name: "حذاء أطلس", description: "وصف عربي" });
  });

  it("retombe indépendamment sur chaque champ français manquant", () => {
    expect(localizeProduct({ ...product, nameAr: null, descriptionAr: "" }, "ar")).toMatchObject({
      name: "Botte Atlas",
      description: "Description française",
    });
  });

  it("conserve le contenu français pour la locale française", () => {
    expect(localizeProduct(product, "fr")).toMatchObject({ name: "Botte Atlas", description: "Description française" });
  });
});
