import "server-only";

import { db } from "@/lib/db";

const ORDER_NUMBER = /^BOT-[A-Z0-9]{10}$/;

export async function getOrderConfirmation(number: string) {
  if (!ORDER_NUMBER.test(number)) return null;
  return db.order.findUnique({
    where: { number },
    select: {
      number: true,
      status: true,
      totalDh: true,
      createdAt: true,
      items: { select: { productName: true, size: true, color: true, unitPriceDh: true, quantity: true } },
    },
  });
}
