import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/orders/create-order", () => {
  class OrderCreationError extends Error {
    constructor(public readonly code: string, options?: { cause?: unknown; internalCode?: string }) {
      super(code, { cause: options?.cause });
      this.name = "OrderCreationError";
      this.internalCode = options?.internalCode ?? "UNEXPECTED";
    }
    readonly internalCode: string;
  }
  return { createOrder: mocks.createOrder, OrderCreationError };
});
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createOrderAction } from "@/app/actions/create-order";
import { OrderCreationError } from "@/lib/orders/create-order";
import { checkoutSchema } from "@/lib/validation/checkout";

describe("createOrderAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns committed success even when cache revalidation fails", async () => {
    mocks.createOrder.mockResolvedValue({ number: "BOT-ABCDEFGHIJ", productSlugs: ["bottes-noires"] });
    mocks.revalidatePath.mockImplementation(() => { throw new Error("cache unavailable"); });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(createOrderAction({ privateCustomer: "must not log" })).resolves.toEqual({ ok: true, number: "BOT-ABCDEFGHIJ" });
    expect(log).toHaveBeenCalledWith("cache_revalidation_failed", { errorName: "Error" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("privateCustomer");
    log.mockRestore();
  });

  it.each(["OUT_OF_STOCK", "UNKNOWN"] as const)("maps %s service errors", async (code) => {
    mocks.createOrder.mockRejectedValue(new OrderCreationError(code));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(createOrderAction({ secret: "not logged" })).resolves.toEqual({ ok: false, code });
    if (code === "UNKNOWN") expect(log).toHaveBeenCalledWith("order_creation_unknown", { errorName: "OrderCreationError", internalCode: "UNEXPECTED" });
    log.mockRestore();
  });

  it("returns flattened French validation errors without logging input", async () => {
    let validationError: ZodError | undefined;
    try { checkoutSchema.parse({ firstName: "X", customerSecret: "hidden" }); } catch (error) { validationError = error as ZodError; }
    mocks.createOrder.mockRejectedValue(new OrderCreationError("INVALID", { cause: validationError }));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await createOrderAction({ customerSecret: "hidden" });
    expect(result).toMatchObject({ ok: false, code: "INVALID", fieldErrors: expect.any(Object) });
    expect(JSON.stringify(result)).toContain("requis");
    expect(JSON.stringify(log.mock.calls)).not.toContain("hidden");
    log.mockRestore();
  });
});
