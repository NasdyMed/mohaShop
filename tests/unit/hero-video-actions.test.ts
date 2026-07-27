import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  handleUpload: vi.fn(),
  randomUUID: vi.fn(() => "12345678-1234-4234-8234-123456789abc"),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  del: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@vercel/blob/client", () => ({ handleUpload: mocks.handleUpload }));
vi.mock("@vercel/blob", () => ({ del: mocks.del }));
vi.mock("node:crypto", async (original) => ({ ...(await original<typeof import("node:crypto")>()), randomUUID: mocks.randomUUID }));
vi.mock("@/lib/hero/admin-mutations", () => ({
  createHeroVideo: mocks.create,
  updateHeroVideos: mocks.update,
  removeHeroVideo: mocks.remove,
  HeroVideoMutationError: class extends Error { constructor(public code: string) { super(code); } },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { POST } from "@/app/api/admin/hero-videos/upload/route";
import { createHeroVideoAction, deleteHeroVideoAction, updateHeroVideosAction } from "@/app/actions/hero-videos";

const url = "https://store.public.blob.vercel-storage.com/hero/a.mp4";
const input = { url, title: "Vidéo accueil", position: 0, isVisible: true };
const mp4 = new Uint8Array([0, 0, 0, 12, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0]);

describe("hero video upload route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireAdmin.mockResolvedValue({}); });
  it("authentifie avant de lire la requête", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const request = { json: vi.fn() } as unknown as Request;
    await expect(POST(request)).rejects.toThrow("NEXT_REDIRECT");
    expect(request.json).not.toHaveBeenCalled();
  });
  it("génère un chemin serveur et les contraintes Blob", async () => {
    mocks.handleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      expect(await onBeforeGenerateToken("client/secret.mp4", null, false)).toEqual({
        allowedContentTypes: ["video/mp4", "video/webm"], maximumSizeInBytes: 50 * 1024 * 1024, addRandomSuffix: true,
      });
      return { type: "blob.generate-client-token", clientToken: "token" };
    });
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ type: "blob.generate-client-token", payload: { pathname: "secret.mp4", multipart: false, clientPayload: "video/mp4" } }) }));
    expect(response.status).toBe(200);
    expect(mocks.handleUpload.mock.calls[0][0].body.payload.pathname).toMatch(/^hero\/[0-9a-f-]{36}\.mp4$/);
    expect(mocks.handleUpload.mock.calls[0][0].body.payload.pathname).not.toContain("secret");
  });
});

describe("hero video actions", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.requireAdmin.mockResolvedValue({});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(mp4, { status: 206, headers: { "content-type": "video/mp4", "content-range": `bytes 0-11/${mp4.length}` } })));
  });
  it("authentifie avant validation et IO", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(createHeroVideoAction({})).rejects.toThrow("NEXT_REDIRECT");
    expect(fetch).not.toHaveBeenCalled();
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
  it("supprime la base avant Blob et masque l'erreur provider", async () => {
    mocks.remove.mockResolvedValue({ url });
    mocks.del.mockRejectedValue(new Error("secret token"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(deleteHeroVideoAction("c123456789012345678901234")).resolves.toMatchObject({ ok: true, warning: expect.any(String) });
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(mocks.del.mock.invocationCallOrder[0]);
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret token");
    log.mockRestore();
  });
});
