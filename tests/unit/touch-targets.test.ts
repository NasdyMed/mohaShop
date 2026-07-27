import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("storefront touch targets", () => {
  it("marks compact navigation and confirmation links as touch actions", () => {
    expect(read("components/shop/storefront-shell.tsx")).toContain('className="touch-link"');
    expect(read("components/cart/cart-link.tsx")).toContain('className="touch-link"');
    expect(read("components/cart/add-to-cart.tsx")).toContain('className="touch-link"');
  });

  it("gives touch actions a 44 by 44 CSS target", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\.touch-link\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s);
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
