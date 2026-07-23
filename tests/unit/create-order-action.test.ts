import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
  revalidatePath: vi.fn(),
  headers: vi.fn(),
  allow: vi.fn(),
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
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/security/checkout-rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/checkout-rate-limit")>();
  return { ...actual, getCheckoutRateLimiter: () => ({ allow: mocks.allow }) };
});

import { createOrderAction } from "@/app/actions/create-order";
import { OrderCreationError } from "@/lib/orders/create-order";
import { checkoutSchema } from "@/lib/validation/checkout";

describe("createOrderAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "192.0.2.1, 10.0.0.1" }));
    mocks.allow.mockResolvedValue(true);
  });

  it("returns a safe retry result before order work when either bucket is limited", async () => {
    mocks.allow.mockResolvedValue(false);
    const input = { phone: " 06 12 34 56 78 ", privateCustomer: "must not log" };

    await expect(createOrderAction(input)).resolves.toEqual({
      ok: false,
      code: "RATE_LIMITED",
      message: "Trop de commandes ont été tentées. Veuillez réessayer dans quelques minutes.",
    });
    expect(mocks.allow).toHaveBeenCalledWith({ ip: "192.0.2.1", phone: "+212612345678" });
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

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
