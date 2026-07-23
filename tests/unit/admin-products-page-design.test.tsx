import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  products: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/catalog/admin-queries", () => ({ listAdminProducts: mocks.products }));

import AdminProductsPage from "@/app/admin/(protected)/produits/page";

describe("admin product catalog cards", () => {
  it("présente chaque produit comme une carte avec état, prix, stock et action explicite", async () => {
    mocks.products.mockResolvedValue([{
      id: "product-1",
      name: "Botte Atlas",
      priceDh: 1290,
      isVisible: true,
      variants: [{ stock: 3 }, { stock: 0 }],
    }]);

    render(await AdminProductsPage());

    const card = screen.getByRole("article", { name: "Botte Atlas" });
    expect(card).toHaveTextContent("Visible");
    expect(card).toHaveTextContent("1 290 DH");
    expect(card).toHaveTextContent("3 en stock");
    expect(screen.getByRole("link", { name: "Modifier Botte Atlas" })).toHaveAttribute(
      "href",
      "/admin/produits/product-1",
    );
  });
});
