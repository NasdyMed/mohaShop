import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { heroVideoInputSchema } from "@/lib/hero/validation";

export type HeroVideoMutationCode = "INVALID" | "NOT_FOUND" | "TAMPERED" | "DUPLICATE" | "UNKNOWN";
export class HeroVideoMutationError extends Error {
  constructor(public readonly code: HeroVideoMutationCode) { super(code); this.name = "HeroVideoMutationError"; }
}

export async function listAdminHeroVideos() {
  return db.heroVideo.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
}

export async function createHeroVideo(raw: unknown) {
  const parsed = heroVideoInputSchema.safeParse(raw);
  if (!parsed.success || parsed.data.id) throw new HeroVideoMutationError("INVALID");
  try { return await db.heroVideo.create({ data: parsed.data }); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new HeroVideoMutationError("DUPLICATE");
    throw new HeroVideoMutationError("UNKNOWN");
  }
}

export async function updateHeroVideos(raw: unknown[]) {
  const parsed = raw.map((item) => heroVideoInputSchema.safeParse(item));
  if (parsed.some((item) => !item.success || !item.data.id)) throw new HeroVideoMutationError("INVALID");
  const inputs = parsed.map((item) => item.data!);
  const ids = inputs.map(({ id }) => id!);
  const urls = inputs.map(({ url }) => url);
  if (new Set(ids).size !== ids.length || new Set(urls).size !== urls.length) throw new HeroVideoMutationError("DUPLICATE");
  return db.$transaction(async (tx) => {
    const existing = await tx.heroVideo.findMany({ select: { id: true, url: true } });
    if (existing.length !== ids.length) throw new HeroVideoMutationError("TAMPERED");
    const urlsById = new Map(existing.map((video) => [video.id, video.url]));
    if (inputs.some((video) => urlsById.get(video.id!) !== video.url)) throw new HeroVideoMutationError("TAMPERED");
    await Promise.all(inputs.map((video, position) => tx.heroVideo.update({
      where: { id: video.id! },
      data: { url: video.url, title: video.title, isVisible: video.isVisible, position },
    })));
    return tx.heroVideo.findMany({ where: { id: { in: ids } }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  });
}

export async function removeHeroVideo(id: string) {
  const found = await db.heroVideo.findUnique({ where: { id }, select: { url: true } });
  if (!found) throw new HeroVideoMutationError("NOT_FOUND");
  await db.heroVideo.delete({ where: { id } });
  return found;
}
