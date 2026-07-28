"use server";

import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";

type Result = { ok: true; url: string } | { ok: false; message: string };

const MAX_VIDEO_SIZE = 4 * 1024 * 1024;
const extensions: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function hasVideoSignature(type: string, bytes: Uint8Array) {
  if (type === "video/mp4") {
    return bytes.length >= 8
      && bytes[4] === 0x66
      && bytes[5] === 0x74
      && bytes[6] === 0x79
      && bytes[7] === 0x70;
  }
  if (type === "video/webm") {
    return bytes.length >= 4
      && bytes[0] === 0x1a
      && bytes[1] === 0x45
      && bytes[2] === 0xdf
      && bytes[3] === 0xa3;
  }
  return false;
}

export async function uploadHeroVideoAction(formData: FormData): Promise<Result> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, message: "Sélectionnez une vidéo." };
  }
  const extension = extensions[file.type];
  if (!extension) {
    return { ok: false, message: "Format accepté : MP4 ou WebM." };
  }
  if (file.size < 1 || file.size > MAX_VIDEO_SIZE) {
    return { ok: false, message: "La vidéo doit peser entre 1 octet et 4 Mio." };
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasVideoSignature(file.type, header)) {
    return { ok: false, message: "Le contenu du fichier ne correspond pas à une vidéo valide." };
  }
  try {
    const blob = await put(`hero/${randomUUID()}.${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return { ok: true, url: blob.url };
  } catch {
    console.error("hero_video_upload_failed", { category: "provider" });
    return { ok: false, message: "Le téléversement de la vidéo a échoué." };
  }
}
