import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  updateOrderStatus: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/orders/update-status", () => {
  class OrderStatusUpdateError extends Error {
    constructor(public readonly code: string, public readonly internalCode?: string, options?: ErrorOptions) { super(code, options); }
  }
  return { updateOrderStatus: mocks.updateOrderStatus, OrderStatusUpdateError };
});
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { updateOrderStatusAction } from "@/app/actions/update-order-status";
import { OrderStatusUpdateError } from "@/lib/orders/update-status";

describe("updateOrderStatusAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an administrator before validating or mutating", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(updateOrderStatusAction({ orderId: "", target: "bad" })).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("maps validation and domain errors without exposing internals", async () => {
    mocks.requireAdmin.mockResolvedValue({ user: { id: "admin" } });
    await expect(updateOrderStatusAction({ orderId: "", target: "bad" })).resolves.toEqual({
      ok: false, code: "INVALID", message: "Demande invalide.",
    });
    mocks.updateOrderStatus.mockRejectedValue(new OrderStatusUpdateError("INVALID_TRANSITION"));
    await expect(updateOrderStatusAction({ orderId: "order_123", target: "DELIVERED" })).resolves.toEqual({
      ok: false, code: "INVALID_TRANSITION", message: "Ce changement de statut n’est pas autorisé.",
    });
  });

  it("maps not-found and unexpected failures to safe responses", async () => {
    mocks.requireAdmin.mockResolvedValue({ user: { id: "admin" } });
    mocks.updateOrderStatus.mockRejectedValue(new OrderStatusUpdateError("NOT_FOUND"));
    await expect(updateOrderStatusAction({ orderId: "missing", target: "CONFIRMED" })).resolves.toEqual({
      ok: false, code: "NOT_FOUND", message: "Commande introuvable.",
    });
    mocks.updateOrderStatus.mockRejectedValue(new Error("database details"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(updateOrderStatusAction({ orderId: "order_123", target: "CONFIRMED" })).resolves.toEqual({
      ok: false, code: "UNKNOWN", message: "La mise à jour a échoué.",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("database details");
    log.mockRestore();
  });

  it("keeps committed success when best-effort cache refresh fails", async () => {
    mocks.requireAdmin.mockResolvedValue({ user: { id: "admin" } });
    mocks.updateOrderStatus.mockResolvedValue({ id: "order_123", status: "CONFIRMED" });
    mocks.revalidatePath.mockImplementation(() => { throw new Error("cache unavailable"); });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(updateOrderStatusAction({ orderId: "order_123", target: "CONFIRMED" })).resolves.toEqual({ ok: true });
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(4);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/produits", "layout");
    expect(log).toHaveBeenCalledWith("cache_revalidation_failed", expect.objectContaining({ failedCount: 4 }));
    log.mockRestore();
  });

  it("logs only allowlisted diagnostics for exhausted retries", async () => {
    mocks.requireAdmin.mockResolvedValue({ user: { id: "admin" } });
    const cause = Object.assign(new Error("private database detail"), { code: "P2034", query: "secret" });
    mocks.updateOrderStatus.mockRejectedValue(new OrderStatusUpdateError("UNKNOWN", "RETRY_EXHAUSTED", { cause }));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await updateOrderStatusAction({ orderId: "private-order", target: "CONFIRMED" });
    expect(log).toHaveBeenCalledWith("order_status_update_failed", {
      internalCode: "RETRY_EXHAUSTED", causeName: "Error", causeCode: "P2034",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-order");
    expect(JSON.stringify(log.mock.calls)).not.toContain("private database detail");
    log.mockRestore();
  });
});
