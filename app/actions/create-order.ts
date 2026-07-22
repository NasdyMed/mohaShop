"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { createOrder, OrderCreationError } from "@/lib/orders/create-order";

type CreateOrderActionResult =
  | { ok: true; number: string }
  | { ok: false; code: "INVALID" | "OUT_OF_STOCK" | "UNKNOWN"; fieldErrors?: Record<string, string[]> };

export async function createOrderAction(rawInput: unknown): Promise<CreateOrderActionResult> {
  try {
    const result = await createOrder(rawInput);
    revalidatePath("/");
    for (const slug of result.productSlugs) revalidatePath(`/produits/${encodeURIComponent(slug)}`);
    return { ok: true, number: result.number };
  } catch (error) {
    if (error instanceof OrderCreationError) {
      if (error.code === "INVALID") {
        const validationError = error.cause instanceof ZodError ? error.cause : undefined;
        return {
          ok: false,
          code: "INVALID",
          ...(validationError ? { fieldErrors: validationError.flatten().fieldErrors } : {}),
        };
      }
      if (error.code === "OUT_OF_STOCK") return { ok: false, code: "OUT_OF_STOCK" };
    }
    console.error("Unexpected error while creating an order", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { ok: false, code: "UNKNOWN" };
  }
}
