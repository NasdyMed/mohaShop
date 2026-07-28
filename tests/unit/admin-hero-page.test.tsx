import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  upload: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  cleanupUpload: vi.fn(),
}));

vi.mock("@/lib/hero/admin-mutations", () => ({ listAdminHeroVideos: mocks.list }));
vi.mock("@vercel/blob/client", () => ({ upload: mocks.upload }));
vi.mock("@/app/actions/hero-videos", () => ({
  createHeroVideoAction: mocks.create,
  updateHeroVideosAction: mocks.update,
  deleteHeroVideoAction: mocks.remove,
  cleanupHeroVideoUploadAction: mocks.cleanupUpload,
}));

import AdminHeroPage from "@/app/admin/(protected)/hero/page";
import { HeroVideoManager } from "@/components/admin/hero-video-manager";

const first = {
  id: "cm12345678901234567890123",
  url: "https://example.com/atlas.mp4",
  title: "Atlas",
  position: 0,
  isVisible: true,
  deletingAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};
const second = {
  ...first,
  id: "cm22345678901234567890123",
  url: "https://example.com/dunes.webm",
  title: "Dunes",
  position: 1,
  isVisible: false,
};

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("AdminHeroPage", () => {
  it("charge les vidéos et présente la vitrine", async () => {
    mocks.list.mockResolvedValue([first]);
    render(await AdminHeroPage());
    expect(mocks.list).toHaveBeenCalledOnce();
    expect(screen.getByText("Vitrine")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Vidéos du hero", level: 1 })).toBeVisible();
    expect(screen.getByText(/ordre de lecture/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Ajouter des vidéos" })).toBeVisible();
  });
});

describe("HeroVideoManager", () => {
  it("affiche l'état vide et un sélecteur vidéo multiple", () => {
    render(<HeroVideoManager initialVideos={[]} />);
    expect(screen.getByText(/aucune vidéo/i)).toBeVisible();
    const input = screen.getByLabelText("Ajouter des vidéos");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("multiple");
    expect(input).toHaveAttribute("accept", "video/mp4,video/webm");
    expect(screen.getByRole("button", { name: "Enregistrer les modifications" })).toBeDisabled();
  });

  it("affiche les aperçus et permet édition, publication, ordre et sauvegarde", async () => {
    const user = userEvent.setup();
    mocks.update.mockResolvedValue({ ok: true, videos: [{ ...second, position: 0 }, { ...first, title: "Atlas nuit", position: 1 }] });
    render(<HeroVideoManager initialVideos={[first, second]} />);
    const cards = screen.getAllByRole("article");
    expect(within(cards[0]).getByTitle("Aperçu de Atlas")).toHaveAttribute("controls");
    expect(within(cards[0]).getByTitle("Aperçu de Atlas")).toHaveAttribute("preload", "metadata");
    expect(within(cards[0]).getByTitle("Aperçu de Atlas")).toHaveProperty("muted", true);
    expect(within(cards[0]).getByTitle("Aperçu de Atlas")).toHaveAttribute("playsinline");
    const titleInput = screen.getByRole("textbox", { name: "Titre de la vidéo Atlas" });
    await user.clear(titleInput);
    await user.type(titleInput, "Atlas nuit");
    await user.click(screen.getByRole("checkbox", { name: "Vidéo publiée Atlas nuit" }));
    await user.click(screen.getByRole("button", { name: "Descendre Atlas nuit" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith([
      expect.objectContaining({ id: second.id, position: 0 }),
      expect.objectContaining({ id: first.id, title: "Atlas nuit", isVisible: false, position: 1 }),
    ]));
    expect(await screen.findByRole("status")).toHaveTextContent(/enregistrées/i);
  });

  it("verrouille une double sauvegarde et expose aria-busy", () => {
    let resolve!: (value: unknown) => void;
    mocks.update.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<HeroVideoManager initialVideos={[first]} />);
    const form = screen.getByRole("button", { name: "Enregistrer les modifications" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(form).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: /enregistrement/i })).toBeDisabled();
    resolve({ ok: true, videos: [first] });
  });

  it("téléverse plusieurs fichiers avec progression puis crée chaque ligne", async () => {
    const user = userEvent.setup();
    mocks.upload.mockImplementation(async (name: string, _file: File, options: { onUploadProgress(event: { percentage: number }): void }) => {
      options.onUploadProgress({ percentage: 48 });
      return { url: `https://blob.test/${name}` };
    });
    mocks.create
      .mockResolvedValueOnce({ ok: true, video: first })
      .mockResolvedValueOnce({ ok: true, video: second });
    render(<HeroVideoManager initialVideos={[]} />);
    await user.upload(screen.getByLabelText("Ajouter des vidéos"), [
      new File(["mp4"], "Atlas nuit.mp4", { type: "video/mp4" }),
      new File(["webm"], "Dunes.webm", { type: "video/webm" }),
    ]);
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2));
    expect(mocks.upload).toHaveBeenCalledWith("Atlas nuit.mp4", expect.any(File), expect.objectContaining({
      access: "public",
      handleUploadUrl: "/api/admin/hero-videos/upload",
      onUploadProgress: expect.any(Function),
    }));
    expect(mocks.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ title: "Atlas nuit", position: 0, isVisible: false }));
    expect(await screen.findByRole("status")).toHaveTextContent(/2 vidéos ajoutées/i);
  });

  it("conserve l'erreur d'un lot partiel tout en ajoutant les vidéos créées", async () => {
    const user = userEvent.setup();
    mocks.upload
      .mockResolvedValueOnce({ url: "https://blob.test/fail.mp4" })
      .mockResolvedValueOnce({ url: "https://blob.test/ok.mp4" });
    mocks.create
      .mockResolvedValueOnce({ ok: false, message: "La création a échoué.", fieldErrors: {} })
      .mockResolvedValueOnce({ ok: true, video: first });
    render(<HeroVideoManager initialVideos={[]} />);
    await user.upload(screen.getByLabelText("Ajouter des vidéos"), [
      new File(["one"], "fail.mp4", { type: "video/mp4" }),
      new File(["two"], "ok.mp4", { type: "video/mp4" }),
    ]);
    expect(await screen.findByRole("alert")).toHaveTextContent(/1 vidéo ajoutée.*1 échec/i);
    expect(screen.getByRole("article")).toBeVisible();
  });

  it("nettoie exactement une fois le Blob après un refus explicite de création", async () => {
    mocks.upload.mockResolvedValue({ url: "https://store.public.blob.vercel-storage.com/hero/orphan.mp4" });
    mocks.create.mockResolvedValue({ ok: false, message: "La création a échoué.", fieldErrors: {} });
    mocks.cleanupUpload.mockResolvedValue({ ok: true });
    render(<HeroVideoManager initialVideos={[]} />);
    fireEvent.change(screen.getByLabelText("Ajouter des vidéos"), {
      target: { files: [new File(["video"], "orphan.mp4", { type: "video/mp4" })] },
    });
    await waitFor(() => expect(mocks.cleanupUpload).toHaveBeenCalledOnce());
    expect(mocks.cleanupUpload).toHaveBeenCalledWith("https://store.public.blob.vercel-storage.com/hero/orphan.mp4");
    expect(screen.getByRole("alert")).toBeVisible();
  });

  it("ne nettoie pas le Blob si la réponse de création est perdue et peut cacher un commit réussi", async () => {
    mocks.upload.mockResolvedValue({ url: "https://store.public.blob.vercel-storage.com/hero/referenced.mp4" });
    mocks.create.mockRejectedValue(new Error("response lost after commit"));
    render(<HeroVideoManager initialVideos={[]} />);
    fireEvent.change(screen.getByLabelText("Ajouter des vidéos"), {
      target: { files: [new File(["video"], "referenced.mp4", { type: "video/mp4" })] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(/vérifiez.*administration/i);
    expect(mocks.cleanupUpload).not.toHaveBeenCalled();
  });

  it("signale sans détail fournisseur un échec de nettoyage du Blob orphelin", async () => {
    mocks.upload.mockResolvedValue({ url: "https://store.public.blob.vercel-storage.com/hero/orphan.mp4" });
    mocks.create.mockResolvedValue({ ok: false, message: "La création a échoué.", fieldErrors: {} });
    mocks.cleanupUpload.mockResolvedValue({ ok: false, message: "provider secret" });
    render(<HeroVideoManager initialVideos={[]} />);
    fireEvent.change(screen.getByLabelText("Ajouter des vidéos"), {
      target: { files: [new File(["video"], "orphan.mp4", { type: "video/mp4" })] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(/temporaire.*pas pu être nettoyé/i);
    expect(screen.getByRole("alert")).not.toHaveTextContent(/provider secret/i);
  });

  it("refuse type et taille invalides, puis affiche les erreurs réseau et base", async () => {
    render(<HeroVideoManager initialVideos={[]} />);
    const input = screen.getByLabelText("Ajouter des vidéos");
    fireEvent.change(input, { target: { files: [new File(["x"], "image.png", { type: "image/png" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/mp4 ou webm/i);
    const huge = new File(["x"], "large.mp4", { type: "video/mp4" });
    Object.defineProperty(huge, "size", { value: 50 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [huge] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/50 mio/i));
    mocks.upload.mockRejectedValueOnce(new Error("Missing BLOB_READ_WRITE_TOKEN"));
    fireEvent.change(input, { target: { files: [new File(["ok"], "network.mp4", { type: "video/mp4" })] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/missing blob_read_write_token/i));
    mocks.upload.mockResolvedValueOnce({ url: "https://blob.test/db.mp4" });
    mocks.create.mockResolvedValueOnce({ ok: false, message: "La création a échoué.", fieldErrors: {} });
    fireEvent.change(input, { target: { files: [new File(["ok"], "db.mp4", { type: "video/mp4" })] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("La création a échoué."));
    expect(screen.queryByRole("textbox", { name: /db/i })).not.toBeInTheDocument();
  });

  it("supprime, conserve un warning et permet de réessayer une suppression différée", async () => {
    const user = userEvent.setup();
    mocks.remove
      .mockResolvedValueOnce({ ok: true, warning: "Le fichier distant n’a pas pu être supprimé." })
      .mockResolvedValueOnce({ ok: true });
    render(<HeroVideoManager initialVideos={[first]} />);
    await user.click(screen.getByRole("button", { name: "Supprimer Atlas" }));
    expect(await screen.findByText("Suppression à réessayer")).toBeVisible();
    expect(screen.getByRole("textbox", { name: /titre/i })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /vidéo publiée/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /monter/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /descendre/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Réessayer la suppression de Atlas" }));
    await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument());
    expect(mocks.remove).toHaveBeenCalledTimes(2);
  });

  it("annonce et verrouille toute l'interface pendant une suppression", async () => {
    let resolve!: (value: unknown) => void;
    mocks.remove.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<HeroVideoManager initialVideos={[first, second]} />);
    const deleteButton = screen.getByRole("button", { name: "Supprimer Atlas" });
    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);
    expect(mocks.remove).toHaveBeenCalledOnce();
    const form = screen.getByRole("button", { name: "Enregistrer les modifications" }).closest("form")!;
    expect(form).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Ajouter des vidéos" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Supprimer Dunes" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Vidéo publiée Dunes" })).toBeDisabled();
    resolve({ ok: true });
  });

  it("rend les suppressions déjà différées non éditables et gère l'échec du retry", async () => {
    const user = userEvent.setup();
    mocks.remove.mockResolvedValue({ ok: false, message: "Réessayez plus tard.", fieldErrors: {} });
    render(<HeroVideoManager initialVideos={[{ ...first, deletingAt: new Date("2026-02-01") }]} />);
    expect(screen.getByText("Suppression à réessayer")).toBeVisible();
    expect(screen.getByRole("textbox", { name: /titre/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /réessayer la suppression/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Réessayez plus tard.");
  });
});
