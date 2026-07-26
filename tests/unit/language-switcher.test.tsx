import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ value: "/produits/botte-atlas" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

import { LanguageSwitcher } from "@/components/shop/language-switcher";

afterEach(cleanup);

describe("LanguageSwitcher", () => {
  it("propose les drapeaux accessibles et conserve la page équivalente", () => {
    render(<LanguageSwitcher locale="fr" />);
    expect(screen.getByRole("link", { name: "Français" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "العربية" })).toHaveAttribute("href", "/ar/produits/botte-atlas");
  });

  it("mémorise la langue choisie", () => {
    render(<LanguageSwitcher locale="fr" />);
    fireEvent.click(screen.getByRole("link", { name: "العربية" }));
    expect(document.cookie).toContain("storefront-locale=ar");
  });
});
