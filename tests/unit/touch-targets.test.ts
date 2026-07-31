import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

function ruleBlocksContaining(css: string, selector: string): string[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks: string[] = [];

  for (let cursor = 0; cursor < source.length;) {
    const open = source.indexOf("{", cursor);
    if (open === -1) break;

    let depth = 1;
    let close = open + 1;
    while (close < source.length && depth > 0) {
      if (source[close] === "{") depth += 1;
      if (source[close] === "}") depth -= 1;
      close += 1;
    }

    const prelude = source.slice(cursor, open).trim();
    const contents = source.slice(open + 1, close - 1);
    if (prelude.startsWith("@")) {
      blocks.push(...ruleBlocksContaining(contents, selector));
    } else if (prelude.split(",").some((candidate) => candidate.trim().includes(selector))) {
      blocks.push(contents);
    }
    cursor = close;
  }

  return blocks;
}

const pixelMinHeightsFor = (css: string, selector: string) => ruleBlocksContaining(css, selector)
  .flatMap((declarations) => Array.from(declarations.matchAll(/min-height\s*:\s*(\d+(?:\.\d+)?)px\b/gi), ([, value]) => Number(value)));

describe("storefront touch targets", () => {
  it("marks compact navigation links as touch actions", () => {
    expect(read("components/shop/storefront-shell.tsx")).toContain('className="touch-link"');
    expect(read("components/cart/cart-link.tsx")).toContain('className="touch-link"');
  });

  it("gives touch actions a 44 by 44 CSS target", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\.touch-link\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s);
  });

  it("gives the add-to-cart button a 52 pixel minimum height", () => {
    const css = read("app/globals.css");
    const style = document.createElement("style");
    const wrapper = document.createElement("div");
    const button = document.createElement("button");
    style.textContent = css;
    wrapper.className = "add-to-cart";
    wrapper.append(button);
    document.head.append(style);
    document.body.append(wrapper);

    try {
      expect(getComputedStyle(button).minHeight).toBe("52px");
    } finally {
      wrapper.remove();
      style.remove();
    }

    const minHeights = pixelMinHeightsFor(css, ".add-to-cart button");
    expect(minHeights).toContain(52);
    expect(minHeights.every((height) => height >= 44)).toBe(true);
  });

  it("detects an unsafe responsive add-to-cart override", () => {
    const css = ".add-to-cart button { min-height: 52px; } @media (max-width: 620px) { .add-to-cart button { min-height: 32px; } }";
    const minHeights = pixelMinHeightsFor(css, ".add-to-cart button");

    expect(minHeights).toEqual([52, 32]);
    expect(minHeights.every((height) => height >= 44)).toBe(false);
  });

  it("adapte le titre de connexion à la largeur réelle de sa carte", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\.admin-login-card\s*\{[^}]*container-type:\s*inline-size;/s);
    expect(css).toMatch(/\.admin-login-card h1[^}]*font-size:\s*clamp\([^;]*cqi[^;]*\);[^}]*line-height:[^;]+;[^}]*overflow-wrap:\s*anywhere;/s);
  });

  it("gives quick color and size choices a 44 pixel target", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\.quick-color-option[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s);
    expect(css).toMatch(/\.quick-size-option[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s);
  });

  it("gives the hero publication switch a centered 44 pixel target", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\.admin-hero-publication\s+\.admin-switch\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;[^}]*justify-content:\s*center;/s);
  });

  it("gives variant color and size choices a 44 pixel target", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\.variant-matrix-color[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s);
    expect(css).toMatch(/\.variant-matrix-size[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s);
    expect(css).toMatch(/\.variant-matrix-color:hover/);
    expect(css).toMatch(/\.variant-matrix-size:hover/);
    expect(css).toMatch(/\.variant-matrix-editor\.is-disabled/);
  });

  it("keeps the admin navigation on screen at 320 pixels", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/@media\s*\(max-width:\s*620px\)\s*\{[^}]*\.admin-header\s*\{[^}]*flex-wrap:\s*wrap;/s);
    expect(css).toMatch(/@media\s*\(max-width:\s*620px\)[\s\S]*?\.admin-header nav\s*\{[^}]*width:\s*100%;[^}]*flex-wrap:\s*wrap;/);
    expect(css).toMatch(/\.admin-header nav a,\s*\.admin-header nav button\s*\{[^}]*min-height:\s*44px;/s);
  });
});
