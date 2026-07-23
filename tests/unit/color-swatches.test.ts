import { describe, expect, it } from "vitest";

import { colorSwatch } from "@/lib/catalog/color-swatches";

describe("colorSwatch", () => {
  it("normalizes known French color names", () => {
    expect(colorSwatch(" Noir ")).toEqual({ background: "#24211f", known: true });
    expect(colorSwatch("Cognac")).toEqual({ background: "#965d35", known: true });
    expect(colorSwatch("BLEU")).toEqual({ background: "#315b7d", known: true });
  });

  it("uses a neutral fallback for unknown colors", () => {
    expect(colorSwatch("Ultraviolet")).toEqual({ background: "#b8afa6", known: false });
  });
});
