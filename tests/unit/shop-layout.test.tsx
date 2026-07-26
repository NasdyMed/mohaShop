import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import ShopLayout from "@/app/(shop)/layout";

afterEach(cleanup);

describe("ShopLayout", () => {
  it("rend le panier du header à l'intérieur du CartProvider", () => {
    render(<ShopLayout><main>Catalogue</main></ShopLayout>);

    expect(screen.getAllByRole("link", { name: /panier/i })).toHaveLength(2);
    expect(screen.getByText("Catalogue")).toBeVisible();
  });
});
