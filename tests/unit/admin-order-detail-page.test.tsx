import { render, screen } from "@testing-library/react";
import { OrderStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), getOrder: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/orders/admin-queries", () => ({ getAdminOrder: mocks.getOrder }));
vi.mock("@/components/admin/order-status-form", () => ({ OrderStatusForm: () => <div /> }));

import AdminOrderPage from "@/app/admin/(protected)/commandes/[id]/page";

describe("AdminOrderPage", () => {
  it("renders minimal delivery data without an empty phone link or region separator", async () => {
    mocks.getOrder.mockResolvedValue({
      id: "order-1", number: "BOT-1", status: OrderStatus.NEW,
      customerFirstName: "Amina", customerLastName: "El Idrissi",
      customerPhone: null, customerEmail: null,
      customerAddress: "12 avenue Mohammed V", customerAddressComplement: null,
      customerCity: "Rabat", customerRegion: null, customerPostalCode: null,
      customerCountry: "Maroc", deliveryNotes: null, totalDh: 700,
      createdAt: new Date("2026-07-28"), updatedAt: new Date("2026-07-28"),
      items: [],
    });

    const { container } = render(await AdminOrderPage({ params: Promise.resolve({ id: "order-1" }) }));

    expect(screen.getByText("—")).toBeVisible();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(screen.getByText(/Rabat/)).toBeVisible();
    expect(screen.queryByText(/· Maroc/)).toBeNull();
  });
});
