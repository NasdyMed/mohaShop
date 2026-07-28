import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/ar" }));
vi.mock("@/components/cart/cart-link", () => ({ CartLink: ({ locale }: { locale: string }) => <a href={locale === "ar" ? "/ar/panier" : "/panier"}>cart</a> }));

import { StorefrontShell } from "@/components/shop/storefront-shell";

afterEach(cleanup);

describe("StorefrontShell", () => {
  it("applique l'arabe et le RTL au storefront", () => {
    render(<StorefrontShell locale="ar"><p>محتوى</p></StorefrontShell>);
    const shell = screen.getByTestId("storefront-locale");
    expect(shell).toHaveAttribute("lang", "ar");
    expect(shell).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("navigation", { name: "التنقل الرئيسي" })).toBeVisible();
    const brand = screen.getByRole("link", { name: "Maelo" });
    expect(brand).toHaveAttribute("href", "/ar");
    expect(screen.getByRole("img", { name: "Maelo" })).toHaveAttribute("src", expect.stringContaining("maelo-logo.png"));
    expect(screen.queryByText("Maison Botte")).not.toBeInTheDocument();
  });
});
