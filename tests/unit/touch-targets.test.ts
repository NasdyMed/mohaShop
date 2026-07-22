import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("storefront touch targets", () => {
  it("marks compact navigation and confirmation links as touch actions", () => {
    expect(read("app/(shop)/commander/page.tsx")).toContain('className="touch-link"');
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
});
