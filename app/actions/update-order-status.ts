"use server";
import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { OrderStatusUpdateError, updateOrderStatus } from "@/lib/orders/update-status";

const schema = z.object({ orderId: z.string().trim().min(1).max(128), target: z.nativeEnum(OrderStatus) }).strict();
type Result = { ok: true } | { ok: false; code: "INVALID" | "NOT_FOUND" | "INVALID_TRANSITION" | "UNKNOWN"; message: string };
const messages = { INVALID: "Demande invalide.", NOT_FOUND: "Commande introuvable.", INVALID_TRANSITION: "Ce changement de statut n’est pas autorisé.", UNKNOWN: "La mise à jour a échoué." } as const;
export async function updateOrderStatusAction(raw: unknown): Promise<Result> {
  await requireAdmin();
  const input = schema.safeParse(raw);
  if (!input.success) return { ok: false, code: "INVALID", message: messages.INVALID };
  try { await updateOrderStatus(input.data.orderId, input.data.target); }
  catch (error) {
    const code = error instanceof OrderStatusUpdateError ? error.code : "UNKNOWN";
    if (code === "UNKNOWN") console.error("order_status_update_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return { ok: false, code, message: messages[code] };
  }
  try { revalidatePath("/admin/commandes"); revalidatePath(`/admin/commandes/${encodeURIComponent(input.data.orderId)}`); revalidatePath("/"); revalidatePath("/produits", "layout"); }
  catch (error) { console.error("cache_revalidation_failed", { errorName: error instanceof Error ? error.name : "UnknownError" }); }
  return { ok: true };
}
