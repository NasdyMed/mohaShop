"use server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";
type Result = { ok: true; url: string } | { ok: false; message: string };
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
function hasSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((byte,index)=>bytes[index]===byte);
  if (type === "image/webp") return [0x52,0x49,0x46,0x46].every((byte,index)=>bytes[index]===byte) && [0x57,0x45,0x42,0x50].every((byte,index)=>bytes[index+8]===byte);
  return false;
}
export async function uploadProductImageAction(formData: FormData): Promise<Result> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Sélectionnez une image." };
  const extension = extensions[file.type];
  if (!extension) return { ok: false, message: "Format accepté : JPEG, PNG ou WebP." };
  if (file.size < 1 || file.size > 5 * 1024 * 1024) return { ok: false, message: "L’image doit peser entre 1 octet et 5 Mio." };
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasSignature(file.type, header)) return { ok: false, message: "Le contenu du fichier ne correspond pas à une image valide." };
  try { const blob = await put(`products/${randomUUID()}.${extension}`, file, { access: "public", addRandomSuffix: true }); return { ok: true, url: blob.url }; }
  catch { console.error("product_image_upload_failed", { category: "provider" }); return { ok: false, message: "Le téléversement a échoué." }; }
}
