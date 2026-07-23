import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import ShopLoading from "@/app/(shop)/loading";
import AdminLoading from "@/app/admin/loading";

afterEach(cleanup);

describe("route loading boundaries", () => {
  it("annonce le chargement de la boutique", () => {
    render(<ShopLoading />);
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Chargement de la boutique…");
  });

  it("annonce le chargement de l’administration", () => {
    render(<AdminLoading />);
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Chargement de l’administration…");
  });
});
