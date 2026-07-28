import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  uploadHeroVideo: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/hero/admin-mutations", () => ({ listAdminHeroVideos: mocks.list }));
vi.mock("@/app/actions/upload-hero-video", () => ({
  uploadHeroVideoAction: mocks.uploadHeroVideo,
}));
vi.mock("@/app/actions/hero-videos", () => ({
  updateHeroVideosAction: mocks.update,
  deleteHeroVideoAction: mocks.remove,
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
    expect(screen.getByText(/4 Mio maximum/i)).toBeVisible();
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

  it("téléverse plusieurs fichiers par le serveur puis crée chaque ligne", async () => {
    const user = userEvent.setup();
    mocks.uploadHeroVideo.mockImplementation(async (data: FormData) => {
      const file = data.get("file") as File;
      return file.name.startsWith("Atlas")
        ? { ok: true, video: first }
        : { ok: true, video: second };
    });
    render(<HeroVideoManager initialVideos={[]} />);
    await user.upload(screen.getByLabelText("Ajouter des vidéos"), [
      new File(["mp4"], "Atlas nuit.mp4", { type: "video/mp4" }),
      new File(["webm"], "Dunes.webm", { type: "video/webm" }),
    ]);
    await waitFor(() => expect(mocks.uploadHeroVideo).toHaveBeenCalledTimes(2));
    expect(mocks.uploadHeroVideo).toHaveBeenCalledTimes(2);
    expect(mocks.uploadHeroVideo.mock.calls[0][0]).toBeInstanceOf(FormData);
    expect((mocks.uploadHeroVideo.mock.calls[0][0] as FormData).get("file")).toEqual(expect.any(File));
    expect((mocks.uploadHeroVideo.mock.calls[0][0] as FormData).get("position")).toBe("0");
    expect(await screen.findByRole("status")).toHaveTextContent(/2 vidéos ajoutées/i);
  });

  it("conserve l'erreur d'un lot partiel tout en ajoutant les vidéos créées", async () => {
    const user = userEvent.setup();
    mocks.uploadHeroVideo
      .mockResolvedValueOnce({ ok: false, message: "La création a échoué." })
      .mockResolvedValueOnce({ ok: true, video: first });
    render(<HeroVideoManager initialVideos={[]} />);
    await user.upload(screen.getByLabelText("Ajouter des vidéos"), [
      new File(["one"], "fail.mp4", { type: "video/mp4" }),
      new File(["two"], "ok.mp4", { type: "video/mp4" }),
    ]);
    expect(await screen.findByRole("alert")).toHaveTextContent(/1 vidéo ajoutée.*1 échec/i);
    expect(screen.getByRole("article")).toBeVisible();
  });

  it("refuse type et taille invalides, puis affiche les erreurs réseau et base", async () => {
    render(<HeroVideoManager initialVideos={[]} />);
    const input = screen.getByLabelText("Ajouter des vidéos");
    fireEvent.change(input, { target: { files: [new File(["x"], "image.png", { type: "image/png" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/mp4 ou webm/i);
    const huge = new File(["x"], "large.mp4", { type: "video/mp4" });
    Object.defineProperty(huge, "size", { value: 4 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [huge] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/4 mio/i));
    mocks.uploadHeroVideo.mockRejectedValueOnce(new Error("network"));
    fireEvent.change(input, { target: { files: [new File(["ok"], "network.mp4", { type: "video/mp4" })] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/état.*incertain/i));
    mocks.uploadHeroVideo.mockResolvedValueOnce({ ok: false, message: "La création a échoué." });
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
