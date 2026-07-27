import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
  remove: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    heroVideo: { findUnique: mocks.findUnique, delete: mocks.remove },
    $transaction: mocks.transaction,
  },
}));
import { HeroVideoMutationError, removeHeroVideo, updateHeroVideos } from "@/lib/hero/admin-mutations";

const rows = [
  { id: "cm00000000000000000000001", url: "https://store.public.blob.vercel-storage.com/a.mp4", title: "Vidéo A", position: 0, isVisible: true },
  { id: "cm00000000000000000000002", url: "https://store.public.blob.vercel-storage.com/b.mp4", title: "Vidéo B", position: 1, isVisible: true },
];
const tx = { heroVideo: { findMany: mocks.findMany, update: mocks.update } };

describe("hero video admin mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    await expect(removeHeroVideo(rows[0].id)).resolves.toEqual({ url: rows[0].url });
    expect(mocks.remove).toHaveBeenCalledWith({ where: { id: rows[0].id } });
  });
  it("retourne NOT_FOUND sans suppression", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(removeHeroVideo(rows[0].id)).rejects.toBeInstanceOf(HeroVideoMutationError);
    await expect(removeHeroVideo(rows[0].id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
