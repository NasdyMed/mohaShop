import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { computeRetryDelay, OrderCreationError, runWithOrderRetry } from "@/lib/orders/create-order";

function prismaError(code: string, target?: string[]) {
  return new Prisma.PrismaClientKnownRequestError("database write conflict", {
    code,
    clientVersion: "test",
    meta: target ? { target } : undefined,
  });
}

describe("order retry policy", () => {
  it("uses bounded exponential backoff and injectable jitter", () => {
    expect(computeRetryDelay(1, () => 0)).toBe(20);
    expect(computeRetryDelay(2, () => 0.5)).toBe(60);
    expect(computeRetryDelay(5, () => 1)).toBe(250);
  });

  it("retries P2034 conflicts and eventually returns success", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(prismaError("P2034"))
      .mockRejectedValueOnce(prismaError("P2034"))
      .mockResolvedValue("created");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(runWithOrderRetry(operation, { sleep, random: () => 0 })).resolves.toBe("created");
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 20);
    expect(sleep).toHaveBeenNthCalledWith(2, 40);
  });

  it("returns a safe UNKNOWN error after bounded conflict retries", async () => {
    const operation = vi.fn().mockRejectedValue(prismaError("P2034"));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(runWithOrderRetry(operation, { sleep, random: () => 0 })).rejects.toMatchObject({
      code: "UNKNOWN",
      internalCode: "RETRY_EXHAUSTED",
    });
    expect(operation).toHaveBeenCalledTimes(5);
    expect(sleep).toHaveBeenCalledTimes(4);
  });

  it("does not retry domain errors", async () => {
    const operation = vi.fn().mockRejectedValue(new OrderCreationError("OUT_OF_STOCK"));
    const sleep = vi.fn();
    await expect(runWithOrderRetry(operation, { sleep, random: () => 0 })).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
    expect(operation).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });
});
