import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ErrorPage from "@/app/error";
import NotFound from "@/app/not-found";

describe("global error pages", () => {
  it("renders a generic French error and lets the visitor retry", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("customer@example.com secret internals")} reset={reset} />);
    expect(screen.getByRole("heading", { name: /pas pu afficher/i })).toBeInTheDocument();
    expect(screen.queryByText(/customer@example.com|secret internals/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("offers catalog and cart recovery links for missing pages", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: /introuvable/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /collection/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /panier/i })).toHaveAttribute("href", "/panier");
  });
});
