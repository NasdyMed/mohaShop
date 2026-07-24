import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminSaveToast } from "@/components/admin/admin-save-toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AdminSaveToast", () => {
  it("confirme l'enregistrement et peut être fermé manuellement", () => {
    render(<AdminSaveToast />);

    expect(screen.getByRole("status")).toHaveTextContent("Produit enregistré avec succès.");
    fireEvent.click(screen.getByRole("button", { name: "Fermer la notification" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("se ferme automatiquement", () => {
    vi.useFakeTimers();
    render(<AdminSaveToast />);

    act(() => vi.advanceTimersByTime(4500));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
