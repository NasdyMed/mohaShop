"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ProductMutationError, saveProduct } from "@/lib/catalog/admin-mutations";
import { productInputSchema } from "@/lib/validation/product";

type FailureCode = "INVALID" | "INVALID_COLOR" | "NOT_FOUND" | "TAMPERED_VARIANT" | "DUPLICATE_SLUG" | "DUPLICATE_SKU" | "DUPLICATE_VARIANT" | "UNKNOWN";
type Result = { ok: true; id: string; slug: string; previousSlug?: string } | { ok: false; code: FailureCode; message: string; fieldErrors: Record<string, string[]> };
const messages: Record<FailureCode, string> = {
  INVALID: "Vérifiez les champs du produit.", INVALID_COLOR: "Choisissez une couleur proposée.", NOT_FOUND: "Produit introuvable.", TAMPERED_VARIANT: "Une déclinaison est invalide.",
  DUPLICATE_SLUG: "Ce slug est déjà utilisé.", DUPLICATE_SKU: "Ce SKU est déjà utilisé.",
  DUPLICATE_VARIANT: "Cette pointure et cette couleur existent déjà.", UNKNOWN: "L’enregistrement a échoué.",
};

function serializeIssues(issues: { path: PropertyKey[]; message: string }[]) {
  const result: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

export async function saveProductAction(raw: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = productInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "INVALID", message: messages.INVALID, fieldErrors: serializeIssues(parsed.error.issues) };
  try {
    const result = await saveProduct(parsed.data);
    // Remote blob deletion remains intentionally deferred; this action only invalidates cache entries.
    const paths = ["/admin/produits", `/admin/produits/${encodeURIComponent(result.id)}`, "/", `/produits/${encodeURIComponent(result.slug)}`, ...(result.previousSlug ? [`/produits/${encodeURIComponent(result.previousSlug)}`] : [])];
    let failedCount = 0;
    for (const path of paths) { try { revalidatePath(path); } catch { failedCount += 1; } }
    if (failedCount) console.error("product_cache_revalidation_failed", { failedCount });
    return { ok: true, ...result };
  } catch (error) {
    const code = error instanceof ProductMutationError ? error.code : "UNKNOWN";
    if (code === "UNKNOWN") console.error("product_save_failed", { category: "unexpected" });
    return { ok: false, code, message: messages[code], fieldErrors: code === "INVALID_COLOR" ? { variants: [messages.INVALID_COLOR] } : {} };
  }
}
