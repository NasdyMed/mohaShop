import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingLabel } from "@/components/ui/loading-label";

describe("LoadingLabel", () => {
  it("affiche un statut lisible et garde le spinner décoratif", () => {
    render(<LoadingLabel>Connexion en cours…</LoadingLabel>);

    expect(screen.getByRole("status")).toHaveTextContent("Connexion en cours…");
    expect(screen.getByTestId("loading-spinner")).toHaveAttribute("aria-hidden", "true");
  });
});
