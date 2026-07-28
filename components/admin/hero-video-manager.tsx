"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { uploadHeroVideoAction } from "@/app/actions/upload-hero-video";
import {
  cleanupHeroVideoUploadAction,
  createHeroVideoAction,
  deleteHeroVideoAction,
  updateHeroVideosAction,
} from "@/app/actions/hero-videos";
import type { AdminHeroVideoItem } from "@/lib/hero/types";

const MAX_VIDEO_SIZE = 4 * 1024 * 1024;
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

type EditableVideo = AdminHeroVideoItem;
type Feedback = { kind: "error" | "success"; text: string } | null;

function ArrowIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d={direction === "up" ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
    </svg>
  );
}

function normalizePositions(videos: EditableVideo[]) {
  let position = 0;
  return videos.map((video) => video.deletingAt ? video : { ...video, position: position++ });
}

export function HeroVideoManager({ initialVideos }: { initialVideos: AdminHeroVideoItem[] }) {
  const [videos, setVideos] = useState<EditableVideo[]>(() => initialVideos);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const saveLock = useRef(false);
  const uploadLock = useRef(false);
  const deleteLock = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeVideos = videos.filter((video) => !video.deletingAt);
  const locked = busy || uploading || deletingId !== null;

  function patchVideo(id: string, patch: Partial<EditableVideo>) {
    setVideos((current) => current.map((video) => video.id === id ? { ...video, ...patch } : video));
  }

  function move(id: string, delta: number) {
    setVideos((current) => {
      const source = current.findIndex((video) => video.id === id);
      if (source < 0 || current[source].deletingAt) return current;
      let target = source + delta;
      while (target >= 0 && target < current.length && current[target].deletingAt) target += delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[source], next[target]] = [next[target], next[source]];
      return normalizePositions(next);
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saveLock.current || locked || activeVideos.length === 0) return;
    saveLock.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const payload = activeVideos.map((video, position) => ({
        id: video.id,
        url: video.url,
        title: video.title,
        isVisible: video.isVisible,
        position,
      }));
      const result = await updateHeroVideosAction(payload);
      if (!result.ok) {
        setFeedback({ kind: "error", text: result.message });
        return;
      }
      const refreshed = new Map(result.videos.map((video) => [video.id, video]));
      setVideos((current) => current.map((video) => refreshed.get(video.id) ?? video));
      setFeedback({ kind: "success", text: "Modifications enregistrées." });
    } catch {
      setFeedback({ kind: "error", text: "L’enregistrement a échoué. Réessayez." });
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }

  async function addVideos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length || uploadLock.current) return;
    const invalidType = files.find((file) => !VIDEO_TYPES.has(file.type));
    if (invalidType) {
      setFeedback({ kind: "error", text: `${invalidType.name} doit être une vidéo MP4 ou WebM.` });
      return;
    }
    const invalidSize = files.find((file) => file.size > MAX_VIDEO_SIZE);
    if (invalidSize) {
      setFeedback({ kind: "error", text: `${invalidSize.name} dépasse la limite de 4 Mio.` });
      return;
    }

    uploadLock.current = true;
    setUploading(true);
    setFeedback(null);
    let added = 0;
    let failed = 0;
    let cleanupFailed = false;
    let lastError = "";
    async function cleanupOrphan(url: string) {
      try {
        const cleanup = await cleanupHeroVideoUploadAction(url);
        if (!cleanup.ok) cleanupFailed = true;
      } catch {
        cleanupFailed = true;
        console.error("hero_video_upload_cleanup_request_failed", { category: "cleanup" });
      }
    }
    try {
      for (const file of files) {
        setUploadName(file.name);
        let uploadedUrl = "";
        try {
          const data = new FormData();
          data.set("file", file);
          const uploadResult = await uploadHeroVideoAction(data);
          if (!uploadResult.ok) {
            failed += 1;
            lastError = uploadResult.message;
            setFeedback({ kind: "error", text: lastError });
            continue;
          }
          uploadedUrl = uploadResult.url;
        } catch {
          failed += 1;
          lastError = `Le téléversement de ${file.name} a échoué. Réessayez.`;
          setFeedback({ kind: "error", text: lastError });
          continue;
        }
        const title = file.name.replace(/\.[^.]+$/, "");
        let result;
        try {
          result = await createHeroVideoAction({
            url: uploadedUrl,
            title,
            position: activeVideos.length + added,
            isVisible: false,
          });
        } catch {
          failed += 1;
          lastError = `L’état de ${file.name} est incertain. Vérifiez la liste dans l’administration avant de réessayer.`;
          setFeedback({ kind: "error", text: lastError });
          continue;
        }
        if (!result.ok) {
          failed += 1;
          lastError = result.message;
          await cleanupOrphan(uploadedUrl);
          setFeedback({ kind: "error", text: lastError });
          continue;
        }
        added += 1;
        setVideos((current) => normalizePositions([...current, result.video]));
      }
      if (failed > 0 && added > 0) {
        setFeedback({ kind: "error", text: `${added} vidéo${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""}, ${failed} échec${failed > 1 ? "s" : ""}.${cleanupFailed ? " Certains fichiers temporaires n’ont pas pu être nettoyés." : ""}` });
      } else if (added > 0) {
        setFeedback({ kind: "success", text: `${added} vidéo${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""}.` });
      } else if (failed > 0 && cleanupFailed) {
        setFeedback({ kind: "error", text: `${lastError} Le fichier temporaire n’a pas pu être nettoyé.` });
      }
    } catch {
      setFeedback({ kind: "error", text: "L’ajout des vidéos a échoué. Réessayez." });
    } finally {
      uploadLock.current = false;
      setUploading(false);
      setUploadName("");
    }
  }

  async function remove(video: EditableVideo) {
    if (deleteLock.current || deletingId || busy || uploading) return;
    deleteLock.current = true;
    setDeletingId(video.id);
    setFeedback(null);
    try {
      const result = await deleteHeroVideoAction(video.id);
      if (!result.ok) {
        setFeedback({ kind: "error", text: result.message });
        return;
      }
      if ("warning" in result && result.warning) {
        patchVideo(video.id, { isVisible: false, deletingAt: new Date() });
        setFeedback({ kind: "error", text: result.warning });
        return;
      }
      setVideos((current) => normalizePositions(current.filter(({ id }) => id !== video.id)));
      setFeedback({ kind: "success", text: "Vidéo supprimée." });
    } catch {
      setFeedback({ kind: "error", text: "La suppression a échoué. Réessayez." });
    } finally {
      deleteLock.current = false;
      setDeletingId(null);
    }
  }

  return (
    <form className="admin-hero-manager" onSubmit={save} aria-busy={busy || uploading || deletingId !== null}>
      <section className="admin-hero-toolbar" aria-label="Ajout de vidéos">
        <div>
          <strong>Bibliothèque vidéo</strong>
          <p>MP4 ou WebM, 4 Mio maximum par fichier.</p>
        </div>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="video/mp4,video/webm"
          multiple
          disabled={locked}
          onChange={addVideos}
          aria-label="Ajouter des vidéos"
        />
        <button className="admin-hero-upload-button" type="button" disabled={locked} onClick={() => inputRef.current?.click()}>
          <span aria-hidden="true">＋</span>
          {uploading ? "Ajout en cours…" : "Ajouter des vidéos"}
        </button>
      </section>

      {uploading && (
        <div className="admin-hero-progress" role="status" aria-live="polite">
          <div><strong>Téléversement de {uploadName}</strong><span>En cours…</span></div>
        </div>
      )}
      {feedback && (
        <p className={`admin-hero-feedback is-${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>
          {feedback.text}
        </p>
      )}

      {videos.length === 0 ? (
        <div className="admin-hero-empty">
          <span aria-hidden="true">▶</span>
          <h2>Aucune vidéo</h2>
          <p>Ajoutez une première vidéo pour composer le hero de la boutique.</p>
        </div>
      ) : (
        <div className="admin-hero-grid">
          {videos.map((video, index) => {
            const pending = Boolean(video.deletingAt);
            const activeIndex = activeVideos.findIndex(({ id }) => id === video.id);
            const deleting = deletingId === video.id;
            return (
              <article className={`admin-hero-card${pending ? " is-pending-delete" : ""}`} key={video.id}>
                <div className="admin-hero-preview">
                  <video
                    title={`Aperçu de ${video.title}`}
                    src={video.url}
                    controls
                    preload="metadata"
                    muted
                    playsInline
                  />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="admin-hero-card-body">
                  {pending && <p className="admin-hero-pending">Suppression à réessayer</p>}
                  <label className="admin-hero-title">
                    Titre
                    <input
                      value={video.title}
                      maxLength={120}
                      disabled={locked || pending}
                      aria-label={`Titre de la vidéo ${video.title}`}
                      onChange={(event) => patchVideo(video.id, { title: event.target.value })}
                    />
                  </label>
                  <div className="admin-hero-publication">
                    <div><strong>Publication</strong><span>{video.isVisible ? "Visible dans la vitrine" : "Brouillon"}</span></div>
                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={video.isVisible}
                        disabled={locked || pending}
                        aria-label={`Vidéo publiée ${video.title}`}
                        onChange={(event) => patchVideo(video.id, { isVisible: event.target.checked })}
                      />
                      <span aria-hidden="true" />
                    </label>
                  </div>
                  <div className="admin-hero-actions">
                    {pending ? (
                      <>
                        <button type="button" className="admin-icon-button" aria-label={`Monter ${video.title}`} disabled><ArrowIcon direction="up" /></button>
                        <button type="button" className="admin-icon-button" aria-label={`Descendre ${video.title}`} disabled><ArrowIcon direction="down" /></button>
                        <button type="button" className="admin-hero-retry" disabled={deleting} onClick={() => remove(video)}>
                          {deleting ? "Nouvel essai…" : `Réessayer la suppression de ${video.title}`}
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="admin-icon-button" aria-label={`Monter ${video.title}`} disabled={locked || activeIndex <= 0} onClick={() => move(video.id, -1)}><ArrowIcon direction="up" /></button>
                        <button type="button" className="admin-icon-button" aria-label={`Descendre ${video.title}`} disabled={locked || activeIndex === activeVideos.length - 1} onClick={() => move(video.id, 1)}><ArrowIcon direction="down" /></button>
                        <button type="button" className="admin-icon-button is-danger" aria-label={`Supprimer ${video.title}`} disabled={locked} onClick={() => remove(video)}><TrashIcon /></button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="admin-hero-savebar">
        <p>Les changements de titre, publication et ordre sont appliqués ensemble.</p>
        <button className="admin-submit" type="submit" disabled={locked || activeVideos.length === 0}>
          {busy ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </div>
    </form>
  );
}
