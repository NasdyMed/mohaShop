// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Db = typeof import("@/lib/db").db;
type Mutations = typeof import("@/lib/hero/admin-mutations");
let db: Db;
let mutations: Mutations;
const prefix = `hero_it_${randomUUID()}`;

async function cleanup() {
  await db.heroVideo.deleteMany({ where: { title: { startsWith: prefix } } });
}

beforeAll(async () => {
  const configured = process.env.TEST_DATABASE_URL;
  const requirement = "TEST_DATABASE_URL doit cibler une base PostgreSQL isolée nommée « test » ou dont le nom finit par « _test ».";
  if (!configured) throw new Error(`Integration precondition: ${requirement}`);
  const parsed = new URL(configured);
  const database = decodeURIComponent(parsed.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !/(?:^|_)test$/i.test(database)) {
    throw new Error(`Refusing integration test: ${requirement}`);
  }
  process.env.DATABASE_URL = configured;
  ({ db } = await import("@/lib/db"));
  mutations = await import("@/lib/hero/admin-mutations");
  await cleanup();
});
afterAll(async () => { if (db) { await cleanup(); await db.$disconnect(); } });

describe.sequential("hero video admin persistence", () => {
  it("crée, masque, réordonne et trie les vidéos", async () => {
    const created = await Promise.all([0, 1, 2].map((index) => mutations.createHeroVideo({
      url: `https://store.public.blob.vercel-storage.com/${prefix}-${index}.mp4`,
      title: `${prefix}-${index}`, position: index, isVisible: true,
    })));
    await mutations.updateHeroVideos([
      { ...created[2], title: created[2].title, isVisible: true },
      { ...created[0], title: created[0].title, isVisible: true },
      { ...created[1], title: created[1].title, isVisible: false },
    ]);
    const listed = (await mutations.listAdminHeroVideos()).filter(({ title }) => title.startsWith(prefix));
    expect(listed.map(({ id, position, isVisible }) => ({ id, position, isVisible }))).toEqual([
      { id: created[2].id, position: 0, isVisible: true },
      { id: created[0].id, position: 1, isVisible: true },
      { id: created[1].id, position: 2, isVisible: false },
    ]);
  });
  it("sérialise deux réordonnancements concurrents sans positions dupliquées", async () => {
    const current = (await mutations.listAdminHeroVideos()).filter(({ title }) => title.startsWith(prefix));
    const forward = current.map((video) => ({ ...video }));
    const reverse = [...forward].reverse();
    await Promise.all([mutations.updateHeroVideos(forward), mutations.updateHeroVideos(reverse)]);
    const saved = (await mutations.listAdminHeroVideos()).filter(({ title }) => title.startsWith(prefix));
    expect(saved.map(({ position }) => position).sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });
  it("empêche une mise à jour bulk de ressusciter une suppression en attente", async () => {
    const current = (await mutations.listAdminHeroVideos()).filter(({ title }) => title.startsWith(prefix));
    const target = current[0];
    await mutations.markHeroVideoForDeletion(target.id);
    await expect(mutations.updateHeroVideos(current)).rejects.toMatchObject({ code: "TAMPERED" });
    const pending = await db.heroVideo.findUniqueOrThrow({ where: { id: target.id } });
    expect(pending).toMatchObject({ isVisible: false, deletingAt: expect.any(Date), url: target.url });
    await db.heroVideo.update({ where: { id: target.id }, data: { isVisible: true } });
    await mutations.finalizeHeroVideoDeletion(target.id, target.url);
    await expect(db.heroVideo.findUnique({ where: { id: target.id } })).resolves.toBeNull();
  });
});
