"use server";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createHeroVideo, finalizeHeroVideoDeletion, HeroVideoMutationError, markHeroVideoForDeletion, updateHeroVideos } from "@/lib/hero/admin-mutations";
import { hasVideoSignature, heroVideoInputSchema } from "@/lib/hero/validation";

type FailureCode = "INVALID" | "NOT_FOUND" | "TAMPERED" | "DUPLICATE" | "REMOTE_INVALID" | "UNKNOWN";
type Failure = { ok: false; code: FailureCode; message: string; fieldErrors: Record<string, string[]> };
const generic: Record<FailureCode, string> = {
  INVALID: "Vérifiez les champs de la vidéo.", NOT_FOUND: "Vidéo introuvable.", TAMPERED: "La liste de vidéos est invalide.",
  DUPLICATE: "Une vidéo est présente plusieurs fois.", REMOTE_INVALID: "Le fichier vidéo distant est invalide.", UNKNOWN: "L’opération a échoué.",
};
function issues(items: { path: PropertyKey[]; message: string }[]) {
  const result: Record<string, string[]> = {};
  for (const item of items) (result[item.path.map(String).join(".") || "form"] ??= []).push(item.message);
  return result;
}
function failure(code: FailureCode, fieldErrors: Record<string, string[]> = {}): Failure {
  return { ok: false, code, message: generic[code], fieldErrors };
}
function invalidate() {
  for (const path of ["/", "/ar", "/admin/hero"]) {
    try { revalidatePath(path); } catch { console.error("hero_video_revalidation_failed", { category: "cache" }); }
  }
}
function mutationFailure(error: unknown) {
  return failure(error instanceof HeroVideoMutationError ? error.code : "UNKNOWN");
}
async function inspectRemoteVideo(url: string) {
  let response: Response;
  try { response = await fetch(url, { headers: { Range: "bytes=0-11" }, redirect: "manual" }); }
  catch { return false; }
  if (response.status >= 300 && response.status < 400) return false;
  if (!response.ok) return false;
  const type = response.headers.get("content-type")?.split(";")[0].trim();
  if (type !== "video/mp4" && type !== "video/webm") return false;
  const range = response.headers.get("content-range");
  const rangeTotal = range?.match(/^bytes \d+-\d+\/(\d+)$/)?.[1];
  if (range !== null && !rangeTotal) return false;
  const rawSize = range === null ? response.headers.get("content-length") : rangeTotal;
  if (!rawSize || !/^\d+$/.test(rawSize)) return false;
  const size = Number(rawSize);
  if (size < 1 || size > 50 * 1024 * 1024) return false;
  const reader = response.body?.getReader();
  if (!reader) return false;
  const header = new Uint8Array(12);
  let offset = 0;
  try {
    while (offset < header.length) {
      const { done, value } = await reader.read();
      if (done) break;
      const length = Math.min(value.length, header.length - offset);
      header.set(value.subarray(0, length), offset);
      offset += length;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const bytes = header.subarray(0, offset);
  return hasVideoSignature(type, bytes);
}

export async function createHeroVideoAction(raw: unknown) {
  await requireAdmin();
  const parsed = heroVideoInputSchema.safeParse(raw);
  if (!parsed.success || parsed.data.id) return failure("INVALID", issues(parsed.success ? [] : parsed.error.issues));
  if (!(await inspectRemoteVideo(parsed.data.url))) return failure("REMOTE_INVALID", { url: [generic.REMOTE_INVALID] });
  try { const video = await createHeroVideo(parsed.data); invalidate(); return { ok: true as const, video }; }
  catch (error) { return mutationFailure(error); }
}

const updateSchema = z.array(heroVideoInputSchema.extend({ id: z.cuid() })).max(1000);
export async function updateHeroVideosAction(raw: unknown) {
  await requireAdmin();
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return failure("INVALID", issues(parsed.error.issues));
  try { const videos = await updateHeroVideos(parsed.data); invalidate(); return { ok: true as const, videos }; }
  catch (error) { return mutationFailure(error); }
}

export async function deleteHeroVideoAction(id: unknown) {
  await requireAdmin();
  const parsed = z.cuid().safeParse(id);
  if (!parsed.success) return failure("INVALID", { id: ["Identifiant invalide."] });
  try {
    const { url } = await markHeroVideoForDeletion(parsed.data);
    invalidate();
    try {
      await del(url);
      await finalizeHeroVideoDeletion(parsed.data, url);
      return { ok: true as const };
    }
    catch { console.error("hero_video_blob_delete_failed", { category: "provider" }); return { ok: true as const, warning: "Le fichier distant n’a pas pu être supprimé." }; }
  } catch (error) { return mutationFailure(error); }
}
