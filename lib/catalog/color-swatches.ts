const swatches: Record<string, string> = {
  noir: "#24211f",
  cognac: "#965d35",
  marron: "#694a34",
  sable: "#c5a178",
  beige: "#d8c4a8",
  blanc: "#f6f3ed",
  gris: "#817b75",
  bleu: "#315b7d",
};

export const productColorOptions = ["Noir", "Cognac", "Marron", "Sable", "Beige", "Blanc", "Gris", "Bleu"] as const;
export type ProductColor = (typeof productColorOptions)[number];

const colorAliases: Record<string, ProductColor> = {
  black: "Noir",
  brun: "Marron",
  brown: "Marron",
  camel: "Cognac",
  tan: "Sable",
  white: "Blanc",
  grey: "Gris",
  gray: "Gris",
  navy: "Bleu",
};

export function normalizeProductColor(color: string): ProductColor {
  const normalized = color.trim().toLocaleLowerCase("fr");
  const paletteColor = productColorOptions.find((option) => option.toLocaleLowerCase("fr") === normalized);
  return paletteColor ?? colorAliases[normalized] ?? "Noir";
}

export function colorSwatch(color: string) {
  const background = swatches[color.trim().toLocaleLowerCase("fr")];
  return background
    ? { background, known: true }
    : { background: "#b8afa6", known: false };
}
