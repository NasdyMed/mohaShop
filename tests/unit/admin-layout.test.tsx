import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { email: "admin@example.com" } }),
}));
vi.mock("@/app/admin/(protected)/logout-button", () => ({
  LogoutButton: () => <button type="button">Déconnexion</button>,
}));

import AdminLayout from "@/app/admin/(protected)/layout";

describe("AdminLayout", () => {
  it("affiche le logo Maelo comme lien vers l’accueil administrateur", async () => {
    render(await AdminLayout({ children: <main>Contenu</main> }));
    const brand = screen.getByRole("link", { name: "Maelo" });
    expect(brand).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("img", { name: "Maelo" })).toHaveAttribute("src", expect.stringContaining("maelo-logo.png"));
    expect(screen.queryByText("Maison Botte")).not.toBeInTheDocument();
  });
});
