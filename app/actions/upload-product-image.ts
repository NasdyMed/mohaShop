"use server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";
type Result = { ok: true; url: string } | { ok: false; message: string };
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export async function uploadProductImageAction(formData: FormData): Promise<Result> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Sélectionnez une image." };
  const extension = extensions[file.type];
  if (!extension) return { ok: false, message: "Format accepté : JPEG, PNG ou WebP." };
  if (file.size < 1 || file.size > 5 * 1024 * 1024) return { ok: false, message: "L’image doit peser entre 1 octet et 5 Mio." };
  try {
    const blob = await put(`products/${randomUUID()}.${extension}`, file, { access: "public", addRandomSuffix: true });
    return { ok: true, url: blob.url };
  } catch { console.error("product_image_upload_failed", { category: "provider" }); return { ok: false, message: "Le téléversement a échoué." }; }
}
