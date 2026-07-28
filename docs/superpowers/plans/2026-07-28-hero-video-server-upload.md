# Hero Video Server Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le téléversement client des vidéos Hero par un téléversement serveur limité à 4 Mio.

**Architecture:** Une Server Action administrateur valide la taille, le type et la signature du fichier, puis l’envoie dans `hero/` avec `put()`. Le gestionnaire React lui transmet chaque fichier avec `FormData`, conserve le traitement séquentiel et crée la ligne Hero seulement après obtention de l’URL.

**Tech Stack:** Next.js Server Actions, React, Vercel Blob, Vitest, Testing Library.

---

### Task 1: Server Action de téléversement

**Files:**
- Create: `app/actions/upload-hero-video.ts`
- Modify: `tests/unit/hero-video-actions.test.ts`

- [ ] **Step 1: Écrire les tests en échec**

Ajouter des tests qui appellent `uploadHeroVideoAction(formData)` et vérifient :

```ts
expect(await uploadHeroVideoAction(validMp4Form)).toMatchObject({
  ok: true,
  url: "https://store.public.blob.vercel-storage.com/hero/video.mp4",
});
expect(mocks.put).toHaveBeenCalledWith(
  expect.stringMatching(/^hero\/[0-9a-f-]{36}\.mp4$/),
  expect.any(File),
  { access: "public", addRandomSuffix: true },
);
```

Ajouter les cas invalides : fichier absent, type non pris en charge, fichier vide,
taille supérieure à `4 * 1024 * 1024`, signature MP4/WebM invalide et erreur Blob.

- [ ] **Step 2: Vérifier l’échec**

Run: `pnpm exec vitest run tests/unit/hero-video-actions.test.ts --reporter=dot`

Expected: FAIL car `uploadHeroVideoAction` n’existe pas.

- [ ] **Step 3: Implémenter l’action minimale**

Créer une action qui :

```ts
await requireAdmin();
const file = formData.get("file");
// Valider File, MIME, 1..4 Mio et signature binaire.
const blob = await put(`hero/${randomUUID()}.${extension}`, file, {
  access: "public",
  addRandomSuffix: true,
});
return { ok: true, url: blob.url };
```

Les erreurs fournisseur retournent `{ ok: false, message }` et sont journalisées
sans valeur de token.

- [ ] **Step 4: Vérifier les tests**

Run: `pnpm exec vitest run tests/unit/hero-video-actions.test.ts --reporter=dot`

Expected: PASS.

### Task 2: Interface administrateur

**Files:**
- Modify: `components/admin/hero-video-manager.tsx`
- Modify: `tests/unit/admin-hero-page.test.tsx`

- [ ] **Step 1: Écrire les tests en échec**

Remplacer le mock `@vercel/blob/client` par celui de la Server Action et vérifier :

```ts
expect(mocks.uploadHeroVideo).toHaveBeenCalledWith(expect.any(FormData));
expect(screen.getByText(/4 Mio maximum/)).toBeVisible();
```

Vérifier également le refus client d’un fichier supérieur à 4 Mio, le traitement
de plusieurs fichiers et l’affichage de l’erreur renvoyée par l’action.

- [ ] **Step 2: Vérifier l’échec**

Run: `pnpm exec vitest run tests/unit/admin-hero-page.test.tsx --reporter=dot`

Expected: FAIL car l’interface utilise encore `@vercel/blob/client` et 50 Mio.

- [ ] **Step 3: Implémenter le flux serveur**

Importer `uploadHeroVideoAction`, fixer `MAX_VIDEO_SIZE` à 4 Mio, puis pour chaque
fichier :

```ts
const data = new FormData();
data.set("file", file);
const uploadResult = await uploadHeroVideoAction(data);
if (!uploadResult.ok) {
  // Afficher uploadResult.message et poursuivre le lot.
}
```

Supprimer la progression chiffrée et conserver un statut indéterminé avec le nom
du fichier en cours.

- [ ] **Step 4: Vérifier les tests**

Run: `pnpm exec vitest run tests/unit/admin-hero-page.test.tsx --reporter=dot`

Expected: PASS.

### Task 3: Suppression de l’ancien endpoint et vérification

**Files:**
- Delete: `app/api/admin/hero-videos/upload/route.ts`
- Modify: `tests/unit/hero-video-actions.test.ts`

- [ ] **Step 1: Supprimer les tests de génération de jeton et l’endpoint**

Retirer les tests de `handleUpload`, supprimer la route devenue inutilisée et
vérifier qu’aucune référence ne subsiste :

Run: `rg -n "@vercel/blob/client|hero-videos/upload|50 Mio" app components tests`

Expected: aucune référence.

- [ ] **Step 2: Lancer la vérification ciblée**

Run: `pnpm exec vitest run tests/unit/admin-hero-page.test.tsx tests/unit/hero-video-actions.test.ts --reporter=dot`

Expected: PASS.

- [ ] **Step 3: Lancer la vérification globale**

Run: `pnpm test`

Expected: tous les tests passent.

Run: `pnpm lint`

Expected: aucune erreur.

Run: `pnpm build`

Expected: build Next.js réussi.

- [ ] **Step 4: Commit et push**

```powershell
git add -- app/actions/upload-hero-video.ts app/api/admin/hero-videos/upload/route.ts components/admin/hero-video-manager.tsx tests/unit/admin-hero-page.test.tsx tests/unit/hero-video-actions.test.ts docs/superpowers/plans/2026-07-28-hero-video-server-upload.md
git commit -m "fix: upload hero videos through server"
git push origin master
```
