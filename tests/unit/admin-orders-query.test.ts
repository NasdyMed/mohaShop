import { OrderStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));

import { listAdminOrders } from "@/lib/orders/admin-queries";

describe("listAdminOrders", () => {
  beforeEach(() => {
    mocks.count.mockReset();
    mocks.findMany.mockReset();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({ order: { count: mocks.count, findMany: mocks.findMany } }),
    );
  });

  it("filters by a valid status and paginates twenty orders at a time", async () => {
    mocks.count.mockResolvedValue(45);
    mocks.findMany.mockResolvedValue([]);

    const result = await listAdminOrders({ status: OrderStatus.CONFIRMED, page: 2 });

    expect(mocks.count).toHaveBeenCalledWith({ where: { status: OrderStatus.CONFIRMED } });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: OrderStatus.CONFIRMED },
      skip: 20,
      take: 20,
    }));
    expect(result).toMatchObject({ page: 2, pageCount: 3, total: 45, status: OrderStatus.CONFIRMED });
  });

  it("ignores invalid statuses and clamps a page beyond the last page", async () => {
    mocks.count.mockResolvedValue(1);
    mocks.findMany.mockResolvedValue([]);

    const result = await listAdminOrders({ status: "INVALID", page: 999 });

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {}, skip: 0, take: 20 }));
    expect(result).toMatchObject({ page: 1, pageCount: 1, status: undefined });
  });
});
