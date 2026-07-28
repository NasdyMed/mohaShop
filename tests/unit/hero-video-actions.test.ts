import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  randomUUID: vi.fn(() => "12345678-1234-4234-8234-123456789abc"),
  create: vi.fn(),
  update: vi.fn(),
  markForDeletion: vi.fn(),
  finalizeDeletion: vi.fn(),
  findByUrl: vi.fn(),
  del: vi.fn(),
  put: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@vercel/blob", () => ({
  del: mocks.del,
  put: mocks.put,
  BlobNotFoundError: class BlobNotFoundError extends Error {},
}));
vi.mock("node:crypto", async (original) => ({ ...(await original<typeof import("node:crypto")>()), randomUUID: mocks.randomUUID }));
vi.mock("@/lib/hero/admin-mutations", () => ({
  createHeroVideo: mocks.create,
  updateHeroVideos: mocks.update,
  markHeroVideoForDeletion: mocks.markForDeletion,
  finalizeHeroVideoDeletion: mocks.finalizeDeletion,
  findAdminHeroVideoByUrl: mocks.findByUrl,
  HeroVideoMutationError: class extends Error { constructor(public code: string) { super(code); } },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { uploadHeroVideoAction } from "@/app/actions/upload-hero-video";
import { cleanupHeroVideoUploadAction, createHeroVideoAction, deleteHeroVideoAction, updateHeroVideosAction } from "@/app/actions/hero-videos";

const url = "https://store.public.blob.vercel-storage.com/hero/a.mp4";
const input = { url, title: "Vidéo accueil", position: 0, isVisible: true };
const mp4 = new Uint8Array([0, 0, 0, 12, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0]);
const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]);
function uploadForm(file?: File, position = 0) {
  const data = new FormData();
  if (file) data.set("file", file);
  data.set("position", String(position));
  return data;
}

describe("hero video server upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({});
    mocks.put.mockResolvedValue({ url: "https://store.public.blob.vercel-storage.com/hero/video.mp4" });
    mocks.create.mockResolvedValue({
      id: "cm12345678901234567890123",
      url: "https://store.public.blob.vercel-storage.com/hero/video.mp4",
      title: "video",
      position: 0,
      isVisible: false,
    });
  });

  it("authentifie avant de lire le fichier", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const data = uploadForm(new File([mp4], "video.mp4", { type: "video/mp4" }));
    await expect(uploadHeroVideoAction(data)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it.each([
    ["video/mp4", "mp4", mp4],
    ["video/webm", "webm", webm],
  ])("téléverse un fichier %s valide sous un chemin serveur", async (type, extension, bytes) => {
    const data = uploadForm(new File([bytes], `original.${extension}`, { type }));
    await expect(uploadHeroVideoAction(data)).resolves.toMatchObject({
      ok: true,
      video: { id: "cm12345678901234567890123" },
    });
    expect(mocks.put).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^hero/[0-9a-f-]{36}\\.${extension}$`)),
      expect.any(File),
      { access: "public", addRandomSuffix: true },
    );
    expect(mocks.create).toHaveBeenCalledWith({
      url: "https://store.public.blob.vercel-storage.com/hero/video.mp4",
      title: "original",
      position: 0,
      isVisible: false,
    });
  });

  it.each([
    [null, /sélectionnez/i],
    [new File(["text"], "video.txt", { type: "text/plain" }), /mp4 ou webm/i],
    [new File([], "empty.mp4", { type: "video/mp4" }), /entre 1 octet et 4 mio/i],
    [new File(["invalid"], "fake.mp4", { type: "video/mp4" }), /vidéo valide/i],
  ])("refuse un fichier invalide", async (file, message) => {
    const data = uploadForm(file ?? undefined);
    await expect(uploadHeroVideoAction(data)).resolves.toMatchObject({ ok: false, message: expect.stringMatching(message) });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("refuse une vidéo supérieure à 4 Mio", async () => {
    const file = new File([mp4], "large.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 4 * 1024 * 1024 + 1 });
    const data = uploadForm(file);
    await expect(uploadHeroVideoAction(data)).resolves.toMatchObject({ ok: false, message: expect.stringMatching(/4 mio/i) });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("retourne le détail fournisseur utile sans exposer de token", async () => {
    mocks.put.mockRejectedValue(new Error("Vercel Blob: upload rejected"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const data = uploadForm(new File([mp4], "video.mp4", { type: "video/mp4" }));
    await expect(uploadHeroVideoAction(data)).resolves.toMatchObject({
      ok: false,
      message: expect.stringMatching(/upload rejected/i),
    });
    expect(JSON.stringify(log.mock.calls)).toContain("upload rejected");
    mocks.put.mockRejectedValue(new Error("Bearer vercel_blob_rw_super_secret"));
    const secretResult = await uploadHeroVideoAction(data);
    expect(JSON.stringify(secretResult)).not.toContain("super_secret");
    expect(JSON.stringify(log.mock.calls)).not.toContain("super_secret");
    log.mockRestore();
  });

  it("supprime le Blob si la création en base échoue", async () => {
    mocks.create.mockRejectedValue(new Error("database unavailable"));
    mocks.del.mockResolvedValue(undefined);
    const data = uploadForm(new File([mp4], "video.mp4", { type: "video/mp4" }), 3);
    await expect(uploadHeroVideoAction(data)).resolves.toMatchObject({ ok: false });
    expect(mocks.del).toHaveBeenCalledWith("https://store.public.blob.vercel-storage.com/hero/video.mp4");
  });
});

describe("hero video actions", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.requireAdmin.mockResolvedValue({}); mocks.findByUrl.mockResolvedValue(null);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(mp4, { status: 206, headers: { "content-type": "video/mp4", "content-range": `bytes 0-11/${mp4.length}` } })));
  });
  it("authentifie avant validation et IO", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(createHeroVideoAction({})).rejects.toThrow("NEXT_REDIRECT");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("authentifie avant validation pour update et delete", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(updateHeroVideosAction("invalid")).rejects.toThrow("NEXT_REDIRECT");
    await expect(deleteHeroVideoAction("invalid")).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.markForDeletion).not.toHaveBeenCalled();
  });
  it("authentifie avant validation pour le nettoyage d'un upload", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(cleanupHeroVideoUploadAction("invalid")).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.del).not.toHaveBeenCalled();
  });
  it.each([
    "https://store.public.blob.vercel-storage.com/products/a.mp4",
    "https://evil.example/hero/a.mp4",
    "https://store.public.blob.vercel-storage.com/hero%2Fa.mp4",
  ])("refuse de nettoyer une URL hors du répertoire Hero", async (unsafeUrl) => {
    await expect(cleanupHeroVideoUploadAction(unsafeUrl)).resolves.toMatchObject({ ok: false });
    expect(mocks.del).not.toHaveBeenCalled();
  });
  it("nettoie uniquement un Blob Hero et traite l'absence comme un succès idempotent", async () => {
    mocks.del.mockResolvedValueOnce(undefined);
    await expect(cleanupHeroVideoUploadAction(url)).resolves.toEqual({ ok: true });
    expect(mocks.del).toHaveBeenCalledWith(url);
    const { BlobNotFoundError } = await import("@vercel/blob");
    mocks.del.mockRejectedValueOnce(new BlobNotFoundError());
    await expect(cleanupHeroVideoUploadAction(url)).resolves.toEqual({ ok: true });
  });
  it("ne supprime jamais un Blob déjà référencé en base", async () => {
    mocks.findByUrl.mockResolvedValue({ id: "cm12345678901234567890123" });
    await expect(cleanupHeroVideoUploadAction(url)).resolves.toEqual({ ok: true, skipped: true });
    expect(mocks.findByUrl).toHaveBeenCalledWith(url);
    expect(mocks.del).not.toHaveBeenCalled();
  });
  it("masque l'erreur fournisseur si le nettoyage échoue", async () => {
    mocks.del.mockRejectedValueOnce(new Error("secret provider token"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(cleanupHeroVideoUploadAction(url)).resolves.toMatchObject({ ok: false, message: expect.any(String) });
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret provider token");
    log.mockRestore();
  });
  it.each([
    [{ ...input, url: "http://localhost/a.mp4" }, "url"],
    [{ ...input, title: "" }, "title"],
  ])("rejette une entrée invalide", async (bad, field) => {
    const result = await createHeroVideoAction(bad);
    expect(result).toMatchObject({ ok: false, code: "INVALID", fieldErrors: { [field]: expect.any(Array) } });
  });
  it.each([
    [new Response(null, { headers: { "content-type": "video/mp4", "content-length": "0" } })],
    [new Response(null, { headers: { "content-type": "video/mp4", "content-length": String(50 * 1024 * 1024 + 1) } })],
    [new Response(mp4, { headers: { "content-type": "text/plain", "content-length": "12" } })],
    [new Response(new Uint8Array(12), { headers: { "content-type": "video/mp4", "content-length": "12" } })],
    [new Response(mp4, { headers: { "content-type": "video/mp4" } })],
  ])("rejette une vidéo distante non fiable", async (response) => {
    vi.mocked(fetch).mockResolvedValueOnce(response);
    expect((await createHeroVideoAction(input)).ok).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("refuse une redirection HTTP sans suivre sa destination", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: url } }));
    expect((await createHeroVideoAction(input)).ok).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejette un Content-Range présent mais malformé même avec Content-Length", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(mp4, { status: 206, headers: {
      "content-type": "video/mp4", "content-range": "invalid", "content-length": "12",
    } }));
    expect((await createHeroVideoAction(input)).ok).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("utilise la taille totale Content-Range et crée une vidéo valide", async () => {
    mocks.create.mockResolvedValue({ id: "c123", ...input });
    await expect(createHeroVideoAction(input)).resolves.toMatchObject({ ok: true, video: { id: "c123" } });
    expect(fetch).toHaveBeenCalledWith(url, expect.objectContaining({ redirect: "manual", headers: { Range: "bytes=0-11" } }));
  });
  it("met à jour puis invalide toutes les vues", async () => {
    mocks.update.mockResolvedValue([]);
    await expect(updateHeroVideosAction([{ id: "c123456789012345678901234", ...input, position: 99 }])).resolves.toMatchObject({ ok: true });
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual(expect.arrayContaining(["/", "/ar", "/admin/hero"]));
  });
  it("conserve la ligne masquée et masque l'erreur provider", async () => {
    mocks.markForDeletion.mockResolvedValue({ url });
    mocks.finalizeDeletion.mockResolvedValue(undefined);
    mocks.del.mockRejectedValue(new Error("secret token"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(deleteHeroVideoAction("c123456789012345678901234")).resolves.toMatchObject({ ok: true, warning: expect.any(String) });
    expect(mocks.markForDeletion.mock.invocationCallOrder[0]).toBeLessThan(mocks.del.mock.invocationCallOrder[0]);
    expect(mocks.finalizeDeletion).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret token");
    log.mockRestore();
  });
  it("finalise la suppression seulement après le succès Blob", async () => {
    mocks.markForDeletion.mockResolvedValue({ url });
    mocks.del.mockResolvedValue(undefined);
    await expect(deleteHeroVideoAction("c123456789012345678901234")).resolves.toEqual({ ok: true });
    expect(mocks.del.mock.invocationCallOrder[0]).toBeLessThan(mocks.finalizeDeletion.mock.invocationCallOrder[0]);
    expect(mocks.finalizeDeletion).toHaveBeenCalledWith("c123456789012345678901234", url);
  });
  it("finalise aussi une suppression Blob déjà absente", async () => {
    const { BlobNotFoundError } = await import("@vercel/blob");
    mocks.markForDeletion.mockResolvedValue({ url });
    mocks.del.mockRejectedValue(new BlobNotFoundError());
    await expect(deleteHeroVideoAction("c123456789012345678901234")).resolves.toEqual({ ok: true });
    expect(mocks.finalizeDeletion).toHaveBeenCalledWith("c123456789012345678901234", url);
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  it("rend les retries après finalisation idempotents", async () => {
    const { HeroVideoMutationError } = await import("@/lib/hero/admin-mutations");
    mocks.markForDeletion.mockRejectedValue(new HeroVideoMutationError("NOT_FOUND"));
    await expect(deleteHeroVideoAction("c123456789012345678901234")).resolves.toEqual({ ok: true });
    expect(mocks.del).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });
});
