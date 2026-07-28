import { cleanup, render, screen } from "@testing-library/react";
import { OrderStatus } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), listOrders: vi.fn() }));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/orders/admin-queries", () => ({ listAdminOrders: mocks.listOrders }));

import AdminOrdersPage from "@/app/admin/(protected)/commandes/page";

describe("AdminOrdersPage", () => {
  afterEach(cleanup);
  it("renders a dash when a minimal order has no phone", async () => {
    mocks.listOrders.mockResolvedValue({
      orders: [{
        id: "order-1", number: "BOT-1", createdAt: new Date("2026-07-28"),
        customerFirstName: "Amina", customerLastName: "El Idrissi",
        customerPhone: null, totalDh: 700, status: OrderStatus.NEW,
      }],
      total: 1, page: 1, pageCount: 1, status: undefined, q: "",
    });

    render(await AdminOrdersPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("cell", { name: "—" })).toBeVisible();
  });

  it("preserves status and search filters in pagination links", async () => {
    mocks.listOrders.mockResolvedValue({
      orders: [],
      total: 45,
      page: 2,
      pageCount: 3,
      status: OrderStatus.CONFIRMED,
      q: "Atlas",
    });

    render(await AdminOrdersPage({ searchParams: Promise.resolve({ status: "CONFIRMED", q: "Atlas", page: "2" }) }));

    expect(screen.getByRole("combobox", { name: "Statut" })).toHaveValue(OrderStatus.CONFIRMED);
    expect(screen.getByRole("link", { name: /précédent/i })).toHaveAttribute(
      "href",
      "/admin/commandes?q=Atlas&status=CONFIRMED&page=1",
    );
    expect(screen.getByRole("link", { name: /suivant/i })).toHaveAttribute(
      "href",
      "/admin/commandes?q=Atlas&status=CONFIRMED&page=3",
    );
  });
});
