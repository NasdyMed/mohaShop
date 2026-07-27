import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
  remove: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    heroVideo: { findMany: mocks.findMany, findUnique: mocks.findUnique, update: mocks.update, deleteMany: mocks.remove },
    $transaction: mocks.transaction,
  },
}));
import { finalizeHeroVideoDeletion, findAdminHeroVideoByUrl, HeroVideoMutationError, listAdminHeroVideos, markHeroVideoForDeletion, updateHeroVideos } from "@/lib/hero/admin-mutations";

const rows = [
  { id: "cm00000000000000000000001", url: "https://store.public.blob.vercel-storage.com/a.mp4", title: "Vidéo A", position: 0, isVisible: true, deletingAt: null },
  { id: "cm00000000000000000000002", url: "https://store.public.blob.vercel-storage.com/b.mp4", title: "Vidéo B", position: 1, isVisible: true, deletingAt: null },
];
const tx = { heroVideo: { findMany: mocks.findMany, update: mocks.update } };

describe("hero video admin mutations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation((callback) => callback(tx));
    mocks.findMany.mockResolvedValue(rows);
    mocks.update.mockResolvedValue({});
  });
  it("rejette une URL arbitraire associée à un ID existant", async () => {
    const bad = [{ ...rows[0], url: "https://store.public.blob.vercel-storage.com/other.mp4" }, rows[1]];
    await expect(updateHeroVideos(bad)).rejects.toMatchObject({ code: "TAMPERED" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejette l'échange des URLs entre IDs", async () => {
    await expect(updateHeroVideos([{ ...rows[0], url: rows[1].url }, { ...rows[1], url: rows[0].url }])).rejects.toMatchObject({ code: "TAMPERED" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejette une sous-liste qui omet une ligne existante", async () => {
    await expect(updateHeroVideos([rows[0]])).rejects.toMatchObject({ code: "TAMPERED" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([
    [[rows[0], rows[0]]],
    [[rows[0], { ...rows[1], url: rows[0].url }]],
  ])("rejette les doublons ID ou URL", async (input) => {
    await expect(updateHeroVideos(input)).rejects.toMatchObject({ code: "DUPLICATE" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("supprime la ligne et retourne son URL", async () => {
    mocks.findUnique.mockResolvedValue({ url: rows[0].url });
    mocks.update.mockResolvedValue({ url: rows[0].url });
    await expect(markHeroVideoForDeletion(rows[0].id)).resolves.toEqual({ url: rows[0].url });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: rows[0].id },
      data: { isVisible: false, deletingAt: expect.any(Date) },
      select: { url: true },
    });
  });
  it("retourne NOT_FOUND sans suppression", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(markHeroVideoForDeletion(rows[0].id)).rejects.toBeInstanceOf(HeroVideoMutationError);
    await expect(markHeroVideoForDeletion(rows[0].id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("finalise uniquement la ligne correspondant à l'id et l'url", async () => {
    mocks.remove.mockResolvedValue({ count: 1 });
    await finalizeHeroVideoDeletion(rows[0].id, rows[0].url);
    expect(mocks.remove).toHaveBeenCalledWith({ where: { id: rows[0].id, url: rows[0].url, deletingAt: { not: null } } });
  });
  it("retente au plus trois fois une transaction P2034 en isolation sérialisable", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "7.9.0" });
    mocks.transaction.mockRejectedValueOnce(conflict).mockRejectedValueOnce(conflict).mockImplementationOnce((callback) => callback(tx));
    await expect(updateHeroVideos(rows)).resolves.toEqual(rows);
    expect(mocks.transaction).toHaveBeenCalledTimes(3);
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  });
  it("ne retente ni ne masque les autres erreurs Prisma", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("boom", { code: "P2000", clientVersion: "7.9.0" });
    mocks.transaction.mockRejectedValue(error);
    await expect(updateHeroVideos(rows)).rejects.toBe(error);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
  it("arrête après trois conflits P2034 et rejette le dernier", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "7.9.0" });
    mocks.transaction.mockRejectedValue(conflict);
    await expect(updateHeroVideos(rows)).rejects.toBe(conflict);
    expect(mocks.transaction).toHaveBeenCalledTimes(3);
  });
  it("exclut les suppressions en attente de l'ensemble éditable", async () => {
    const pending = { ...rows[1], deletingAt: new Date() };
    mocks.findMany.mockResolvedValue([rows[0]]);
    await expect(updateHeroVideos([rows[0], pending])).rejects.toMatchObject({ code: "TAMPERED" });
    expect(mocks.findMany).toHaveBeenCalledWith({ where: { deletingAt: null }, select: { id: true, url: true } });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("conserve les suppressions en attente dans la liste admin pour permettre un retry", async () => {
    const pending = { ...rows[1], deletingAt: new Date() };
    mocks.findMany.mockResolvedValue([rows[0], pending]);
    await expect(listAdminHeroVideos()).resolves.toEqual([rows[0], pending]);
    expect(mocks.findMany).toHaveBeenCalledWith({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  });
  it("recherche une référence Hero par URL exacte", async () => {
    mocks.findUnique.mockResolvedValue({ id: rows[0].id });
    await expect(findAdminHeroVideoByUrl(rows[0].url)).resolves.toEqual({ id: rows[0].id });
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { url: rows[0].url }, select: { id: true } });
  });
});
