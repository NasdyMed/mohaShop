import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrderStatus } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ update: vi.fn(), refresh: vi.fn() }));
vi.mock("@/app/actions/update-order-status", () => ({ updateOrderStatusAction: mocks.update }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

import { OrderStatusForm } from "@/components/admin/order-status-form";

describe("OrderStatusForm", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, "confirm").mockReturnValue(true); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("locks synchronously against duplicate submissions", async () => {
    let resolve!: (value: { ok: true }) => void;
    mocks.update.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<OrderStatusForm orderId="order_123" targets={[OrderStatus.CONFIRMED]} />);
    const form = screen.getByRole("button", { name: "Mettre à jour" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    resolve({ ok: true });
    await waitFor(() => expect(screen.getByText("Statut mis à jour.")).toBeInTheDocument());
  });

  it("requires confirmation before cancellation", () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<OrderStatusForm orderId="order_123" targets={[OrderStatus.CANCELLED]} />);
    fireEvent.submit(screen.getByRole("button", { name: "Mettre à jour" }).closest("form")!);
    expect(window.confirm).toHaveBeenCalledWith("Confirmer l’annulation ? Le stock des articles sera restauré.");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("announces action errors to assistive technology", async () => {
    mocks.update.mockResolvedValue({ ok: false, code: "INVALID_TRANSITION", message: "Ce changement n’est pas autorisé." });
    render(<OrderStatusForm orderId="order_123" targets={[OrderStatus.CONFIRMED]} />);
    fireEvent.submit(screen.getByRole("button", { name: "Mettre à jour" }).closest("form")!);
    await waitFor(() => expect(screen.getByText("Ce changement n’est pas autorisé.")).toHaveAttribute("aria-live", "polite"));
  });

  it("reports an uncertain network failure and unlocks for retry", async () => {
    mocks.update.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ ok: true });
    render(<OrderStatusForm orderId="order_123" targets={[OrderStatus.CONFIRMED]} />);
    const form = screen.getByRole("button", { name: "Mettre à jour" }).closest("form")!;
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByText("La mise à jour a peut-être échoué. Actualisez la page avant de réessayer.")).toHaveAttribute("aria-live", "polite"));
    fireEvent.submit(form);
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
  });
});
