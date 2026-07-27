# Hero Video and Product Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un carrousel de vidéos administrable au hero et remplacer l’édition ligne par ligne des déclinaisons et images par une matrice couleur-pointure et des galeries par couleur.

**Architecture:** Un modèle `HeroVideo` spécialisé stocke les métadonnées des fichiers Vercel Blob. Le storefront rend un composant client de carrousel avec fallback serveur vers l’image produit. Les variantes restent des lignes `ProductVariant`; des fonctions pures transforment la sélection couleur-pointure en matrice sans modifier le contrat de sauvegarde existant.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/PostgreSQL, Vercel Blob client uploads, Zod, Vitest, Testing Library, CSS global existant.

---

## Carte des fichiers

### Hero vidéo

- `prisma/schema.prisma` : modèle `HeroVideo`.
- `prisma/migrations/20260727120000_add_hero_videos/migration.sql` : table et index d’ordre/publication.
- `lib/hero/types.ts` : contrat public minimal d’une vidéo.
- `lib/hero/validation.ts` : URL Blob, titre, ordre et signature MP4/WebM.
- `lib/hero/queries.ts` : lecture publique des vidéos visibles.
- `lib/hero/admin-mutations.ts` : création, édition, ordre et suppression transactionnelle.
- `app/api/admin/hero-videos/upload/route.ts` : jeton d’upload Blob authentifié.
- `app/actions/hero-videos.ts` : actions admin et invalidation du catalogue.
- `components/admin/hero-video-manager.tsx` : upload, progression et cartes administrables.
- `app/admin/(protected)/hero/page.tsx` : page admin dédiée.
- `components/shop/hero-media.tsx` : frontière fallback image/carrousel.
- `components/shop/hero-video-carousel.tsx` : lecture, transition et navigation.

### Déclinaisons et images

- `lib/catalog/variant-matrix.ts` : sélection et produit cartésien.
- `components/admin/variant-editor.tsx` : palette multiple, carreaux 35–46, matrice de stocks et zone SKU avancée.
- `components/admin/confirm-removal-dialog.tsx` : confirmation accessible des retraits sensibles.
- `lib/catalog/product-image-groups.ts` : groupes et positions d’images par couleur.
- `components/admin/product-image-groups.tsx` : galeries de six images par couleur.
- `components/admin/product-form.tsx` : orchestration des deux éditeurs.
- `lib/validation/product.ts` : limite de six images par couleur.
- `lib/catalog/admin-mutations.ts` : conservation des variantes historiques.

### Présentation et tests

- `app/globals.css` : composants Impeccable, états, responsive et mouvement réduit.
- `tests/unit/hero-video-validation.test.ts`
- `tests/unit/hero-video-actions.test.ts`
- `tests/unit/hero-video-carousel.test.tsx`
- `tests/unit/admin-hero-page.test.tsx`
- `tests/unit/variant-matrix.test.ts`
- `tests/unit/variant-editor.test.tsx`
- `tests/unit/product-image-groups.test.tsx`
- `tests/unit/product-validation.test.ts`
- `tests/integration/hero-video-persistence.test.ts`
- `tests/integration/save-product.test.ts`

## Task 1: Modèle et validation du hero

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260727120000_add_hero_videos/migration.sql`
- Create: `lib/hero/types.ts`
- Create: `lib/hero/validation.ts`
- Create: `tests/unit/hero-video-validation.test.ts`

- [ ] **Step 1: écrire les tests de validation en échec**

```ts
import { describe, expect, it } from "vitest";
import { heroVideoInputSchema, hasVideoSignature } from "@/lib/hero/validation";

describe("heroVideoInputSchema", () => {
  it("accepte une vidéo Blob valide", () => {
    expect(heroVideoInputSchema.safeParse({
      url: "https://shop.public.blob.vercel-storage.com/hero/demo.mp4",
      title: "Campagne été",
      position: 0,
      isVisible: true,
    }).success).toBe(true);
  });

  it("rejette une origine distante non autorisée", () => {
    expect(heroVideoInputSchema.safeParse({
      url: "https://evil.test/demo.mp4",
      title: "Campagne été",
      position: 0,
      isVisible: true,
    }).success).toBe(false);
  });

  it("reconnaît MP4 et WebM par leur signature", () => {
    expect(hasVideoSignature("video/mp4", new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]))).toBe(true);
    expect(hasVideoSignature("video/webm", new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]))).toBe(true);
    expect(hasVideoSignature("video/mp4", new Uint8Array([1, 2, 3, 4]))).toBe(false);
  });
});
```

- [ ] **Step 2: exécuter le test et confirmer l’échec**

Run: `pnpm exec vitest run tests/unit/hero-video-validation.test.ts`

Expected: FAIL, car `@/lib/hero/validation` n’existe pas.

- [ ] **Step 3: ajouter le modèle Prisma**

```prisma
model HeroVideo {
  id        String   @id @default(cuid())
  url       String   @unique
  title     String
  position  Int      @default(0)
  isVisible Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isVisible, position])
}
```

La migration SQL crée la table, l’unicité de `url` et l’index `("isVisible", "position")`.

- [ ] **Step 4: implémenter les contrats et validations**

```ts
export type HeroVideoItem = {
  id: string;
  url: string;
  title: string;
  position: number;
};
```

```ts
import { z } from "zod";

const blobUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:"
    && /^[^.]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname);
}, "URL Vercel Blob invalide.");

export const heroVideoInputSchema = z.object({
  id: z.string().cuid().optional(),
  url: blobUrl,
  title: z.string().trim().min(2).max(120),
  position: z.number().int().min(0),
  isVisible: z.boolean(),
});

export function hasVideoSignature(type: string, bytes: Uint8Array) {
  if (type === "video/webm") return [0x1a, 0x45, 0xdf, 0xa3].every((byte, index) => bytes[index] === byte);
  if (type === "video/mp4") return [0x66, 0x74, 0x79, 0x70].every((byte, index) => bytes[index + 4] === byte);
  return false;
}
```

- [ ] **Step 5: valider Prisma et passer le test**

Run: `pnpm exec prisma validate && pnpm exec prisma generate && pnpm exec vitest run tests/unit/hero-video-validation.test.ts`

Expected: Prisma valide et test PASS.

- [ ] **Step 6: commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260727120000_add_hero_videos lib/hero tests/unit/hero-video-validation.test.ts
git commit -m "feat: add hero video data model"
```

## Task 2: Upload Blob et mutations admin

**Files:**
- Create: `app/api/admin/hero-videos/upload/route.ts`
- Create: `lib/hero/admin-mutations.ts`
- Create: `app/actions/hero-videos.ts`
- Create: `tests/unit/hero-video-actions.test.ts`
- Create: `tests/integration/hero-video-persistence.test.ts`

- [ ] **Step 1: écrire les tests unitaires en échec**

Tester que :

```ts
it("authentifie avant de générer un jeton d'upload", async () => {
  mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
  await expect(POST(new Request("http://local/api/admin/hero-videos/upload", {
    method: "POST",
    body: JSON.stringify({ type: "blob.generate-client-token", payload: {} }),
  }))).rejects.toThrow("NEXT_REDIRECT");
});

it("refuse une vidéo distante trop grande ou avec une fausse signature", async () => {
  mocks.fetch.mockResolvedValue(new Response(new Uint8Array([1, 2, 3, 4]), {
    headers: { "content-length": String(51 * 1024 * 1024), "content-type": "video/mp4" },
  }));
  expect((await createHeroVideoAction(validInput)).ok).toBe(false);
});

it("supprime l'enregistrement et le Blob", async () => {
  await deleteHeroVideoAction("cm12345678901234567890123");
  expect(mocks.del).toHaveBeenCalledWith("https://shop.public.blob.vercel-storage.com/hero/a.mp4");
});
```

- [ ] **Step 2: confirmer l’échec**

Run: `pnpm exec vitest run tests/unit/hero-video-actions.test.ts`

Expected: FAIL, routes et actions absentes.

- [ ] **Step 3: créer la route de jeton client**

Utiliser `handleUpload` de `@vercel/blob/client`. `onBeforeGenerateToken` appelle `requireAdmin()` et retourne :

```ts
{
  allowedContentTypes: ["video/mp4", "video/webm"],
  maximumSizeInBytes: 50 * 1024 * 1024,
  addRandomSuffix: true,
}
```

Le pathname généré suit `hero/<uuid>.<extension>`. Ne jamais réutiliser le nom de fichier fourni par le navigateur.

- [ ] **Step 4: implémenter les mutations transactionnelles**

`lib/hero/admin-mutations.ts` expose :

```ts
export async function listAdminHeroVideos(): Promise<HeroVideoAdminItem[]>;
export async function createHeroVideo(input: HeroVideoInput): Promise<HeroVideoAdminItem>;
export async function updateHeroVideos(inputs: HeroVideoInput[]): Promise<void>;
export async function removeHeroVideo(id: string): Promise<{ url: string }>;
```

`updateHeroVideos` normalise les positions avec l’index du tableau reçu et met à jour toutes les lignes dans une transaction.

- [ ] **Step 5: vérifier le fichier distant avant création**

`createHeroVideoAction` :

1. appelle `requireAdmin()` ;
2. valide l’URL avec `heroVideoInputSchema` ;
3. effectue un `fetch` limité au début du fichier Blob ;
4. refuse un `content-length` vide, nul ou supérieur à 50 Mio ;
5. refuse un MIME ou une signature non autorisée ;
6. crée la ligne et appelle `revalidatePath("/")` et `revalidatePath("/ar")`.

`deleteHeroVideoAction` retire d’abord la ligne en base, invalide les catalogues, puis appelle `del(url)`. Un échec de suppression Blob est journalisé sans restaurer une vidéo déjà retirée de la boutique.

- [ ] **Step 6: passer les tests unitaires**

Run: `pnpm exec vitest run tests/unit/hero-video-actions.test.ts`

Expected: PASS.

- [ ] **Step 7: écrire et exécuter le test d’intégration**

Le test crée trois vidéos, en masque une, change l’ordre et vérifie que la requête publique ne retourne que les deux visibles triées.

Run: `pnpm exec vitest run tests/integration/hero-video-persistence.test.ts`

Expected: PASS uniquement avec une `TEST_DATABASE_URL` isolée dont le nom de base contient `test`.

- [ ] **Step 8: commit**

```bash
git add app/api/admin/hero-videos app/actions/hero-videos.ts lib/hero/admin-mutations.ts tests/unit/hero-video-actions.test.ts tests/integration/hero-video-persistence.test.ts
git commit -m "feat: manage hero video uploads"
```

## Task 3: Page d’administration du hero

**Files:**
- Create: `app/admin/(protected)/hero/page.tsx`
- Create: `components/admin/hero-video-manager.tsx`
- Modify: `app/admin/(protected)/layout.tsx`
- Modify: `app/globals.css`
- Create: `tests/unit/admin-hero-page.test.tsx`

- [ ] **Step 1: écrire le test d’interface en échec**

```tsx
it("affiche l'import et tous les états d'une carte vidéo", () => {
  render(<HeroVideoManager initialVideos={[video]} />);
  expect(screen.getByRole("button", { name: "Ajouter des vidéos" })).toBeVisible();
  expect(screen.getByRole("switch", { name: "Vidéo publiée" })).toBeChecked();
  expect(screen.getByRole("button", { name: "Déplacer la vidéo 1 vers le bas" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Supprimer la vidéo 1" })).toBeVisible();
});
```

- [ ] **Step 2: confirmer l’échec**

Run: `pnpm exec vitest run tests/unit/admin-hero-page.test.tsx`

Expected: FAIL, composant absent.

- [ ] **Step 3: créer la page et la navigation**

Ajouter `<Link href="/admin/hero">Hero</Link>` entre Produits et Commandes. La page serveur charge `listAdminHeroVideos()` puis rend :

```tsx
<main className="admin-main">
  <header className="admin-page-heading">
    <p className="eyebrow">Vitrine</p>
    <h1>Vidéos du hero</h1>
    <p>Importez, ordonnez et publiez les vidéos affichées sur la page d’accueil.</p>
  </header>
  <HeroVideoManager initialVideos={videos} />
</main>
```

- [ ] **Step 4: implémenter le manager**

Le manager utilise `upload` de `@vercel/blob/client`. Il expose :

- input multiple MP4/WebM ;
- progression par fichier ;
- titre initial dérivé du nom sans extension ;
- cartes avec `<video controls preload="metadata">` ;
- champ titre ;
- switch publié ;
- boutons monter, descendre, supprimer ;
- bouton « Enregistrer l’ordre et les publications » ;
- toast succès/erreur existant.

Tous les boutons conservent un libellé accessible. Une opération en cours définit `aria-busy` et empêche une double soumission.

- [ ] **Step 5: appliquer les règles Impeccable**

Ajouter les classes `.admin-hero-*` avec :

- surface crème et cartes blanches ;
- accent ambre pour sélection/progression ;
- danger uniquement pour supprimer ;
- grille responsive ;
- focus visible ;
- cibles de 44 px ;
- états disabled, loading, error et empty explicites.

- [ ] **Step 6: passer le test**

Run: `pnpm exec vitest run tests/unit/admin-hero-page.test.tsx tests/unit/touch-targets.test.ts`

Expected: PASS.

- [ ] **Step 7: commit**

```bash
git add app/admin components/admin/hero-video-manager.tsx app/globals.css tests/unit/admin-hero-page.test.tsx tests/unit/touch-targets.test.ts
git commit -m "feat: add hero video administration"
```

## Task 4: Carrousel vidéo public

**Files:**
- Create: `lib/hero/queries.ts`
- Create: `components/shop/hero-media.tsx`
- Create: `components/shop/hero-video-carousel.tsx`
- Modify: `components/shop/catalog-page.tsx`
- Modify: `app/globals.css`
- Create: `tests/unit/hero-video-carousel.test.tsx`

- [ ] **Step 1: écrire les tests en échec**

```tsx
it("passe à la vidéo suivante à la fin", () => {
  render(<HeroVideoCarousel videos={videos} fallback={<span>fallback</span>} />);
  fireEvent.ended(screen.getByLabelText("Campagne 1"));
  expect(screen.getByLabelText("Campagne 2")).toHaveAttribute("data-active", "true");
});

it("permet la sélection manuelle", async () => {
  render(<HeroVideoCarousel videos={videos} fallback={<span>fallback</span>} />);
  await user.click(screen.getByRole("button", { name: "Afficher la vidéo 2 sur 3" }));
  expect(screen.getByLabelText("Campagne 2")).toHaveAttribute("data-active", "true");
});

it("affiche le fallback lorsque le mouvement est réduit", () => {
  mocks.matchMedia.mockReturnValue({ matches: true });
  render(<HeroVideoCarousel videos={videos} fallback={<span>fallback</span>} />);
  expect(screen.getByText("fallback")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Afficher la vidéo/ })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: confirmer l’échec**

Run: `pnpm exec vitest run tests/unit/hero-video-carousel.test.tsx`

Expected: FAIL, composant absent.

- [ ] **Step 3: ajouter la requête publique**

```ts
export async function listVisibleHeroVideos() {
  return db.heroVideo.findMany({
    where: { isVisible: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, url: true, title: true, position: true },
  });
}
```

- [ ] **Step 4: créer la frontière serveur**

`HeroMedia` reçoit les vidéos et le fallback existant. Sans vidéo, il retourne directement le fallback. Sinon, il rend `HeroVideoCarousel`.

- [ ] **Step 5: implémenter le carrousel**

Le composant :

- maintient `activeIndex` et un ensemble d’indices en erreur ;
- rend uniquement l’actif et le suivant ;
- appelle `video.play()` et ignore proprement un rejet navigateur ;
- passe au suivant sur `ended` ou `error` ;
- revient au fallback lorsque toutes les vidéos échouent ;
- rend des boutons indicateurs avec `aria-current` ;
- détecte `matchMedia("(prefers-reduced-motion: reduce)")`.

- [ ] **Step 6: intégrer au catalogue**

`CatalogPageView` charge en parallèle :

```ts
const [products, heroVideos] = await Promise.all([
  listVisibleProducts(),
  listVisibleHeroVideos(),
]);
```

Le fallback reprend exactement l’image produit actuelle. Le titre de vidéo remplace la légende uniquement lorsqu’une vidéo est active.

- [ ] **Step 7: ajouter le fondu et le mode réduit**

Les médias utilisent opacité et transform uniquement. Sous `@media (prefers-reduced-motion: reduce)`, supprimer transitions et animations. Le layout du hero reste inchangé sur desktop et mobile.

- [ ] **Step 8: passer les tests**

Run: `pnpm exec vitest run tests/unit/hero-video-carousel.test.tsx tests/unit/catalog-page.test.tsx`

Expected: PASS.

- [ ] **Step 9: commit**

```bash
git add lib/hero/queries.ts components/shop/hero-media.tsx components/shop/hero-video-carousel.tsx components/shop/catalog-page.tsx app/globals.css tests/unit/hero-video-carousel.test.tsx
git commit -m "feat: play published hero videos"
```

## Task 5: Fonctions pures de matrice

**Files:**
- Create: `lib/catalog/variant-matrix.ts`
- Create: `tests/unit/variant-matrix.test.ts`

- [ ] **Step 1: écrire les tests en échec**

```ts
const existing = [
  { id: "v1", sku: "ATLAS-NOIR-38", color: "Noir", size: "38", stock: 4 },
];

it("génère le produit cartésien en conservant les variantes existantes", () => {
  expect(buildVariantMatrix(existing, ["Noir", "Cognac"], ["38", "39"])).toEqual([
    existing[0],
    { sku: "ATLAS-NOIR-39", color: "Noir", size: "39", stock: 0 },
    { sku: "ATLAS-COGNAC-38", color: "Cognac", size: "38", stock: 0 },
    { sku: "ATLAS-COGNAC-39", color: "Cognac", size: "39", stock: 0 },
  ]);
});

it("identifie un retrait qui exige une confirmation", () => {
  expect(requiresVariantRemovalConfirmation(existing[0])).toBe(true);
  expect(requiresVariantRemovalConfirmation({ ...existing[0], id: undefined, stock: 0 })).toBe(false);
});
```

- [ ] **Step 2: confirmer l’échec**

Run: `pnpm exec vitest run tests/unit/variant-matrix.test.ts`

Expected: FAIL, module absent.

- [ ] **Step 3: implémenter les constantes et helpers**

```ts
export const productSizes = Array.from({ length: 12 }, (_, index) => String(35 + index));

export function variantKey(color: string, size: string) {
  return `${color.toLocaleLowerCase("fr")}\u0000${size}`;
}

export function buildSuggestedSku(slug: string, color: string, size: string) {
  const token = (value: string) => value.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
  return `${token(slug || "PRODUIT")}-${token(color)}-${token(size)}`;
}
```

`buildVariantMatrix` indexe les variantes existantes par `variantKey`, conserve tous leurs champs et crée uniquement les cellules manquantes avec stock zéro.

- [ ] **Step 4: passer le test**

Run: `pnpm exec vitest run tests/unit/variant-matrix.test.ts`

Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add lib/catalog/variant-matrix.ts tests/unit/variant-matrix.test.ts
git commit -m "feat: add product variant matrix helpers"
```

## Task 6: Éditeur matriciel des déclinaisons

**Files:**
- Rewrite: `components/admin/variant-editor.tsx`
- Create: `components/admin/confirm-removal-dialog.tsx`
- Modify: `components/admin/product-form.tsx`
- Modify: `app/globals.css`
- Create: `tests/unit/variant-editor.test.tsx`
- Modify: `tests/unit/admin-product-form-design.test.tsx`

- [ ] **Step 1: écrire les tests d’interface en échec**

Vérifier :

```tsx
expect(screen.getByRole("checkbox", { name: "Noir" })).toBeChecked();
expect(screen.getByRole("checkbox", { name: "Pointure 38" })).toBeChecked();
expect(screen.getByRole("spinbutton", { name: "Stock Noir, pointure 38" })).toHaveValue(4);
```

Cliquer Cognac et 39 doit créer quatre cellules. Désélectionner Noir avec stock positif doit ouvrir une boîte de confirmation. Annuler conserve les variantes ; confirmer retire les cellules autorisées.

- [ ] **Step 2: confirmer l’échec**

Run: `pnpm exec vitest run tests/unit/variant-editor.test.tsx`

Expected: FAIL avec l’ancien éditeur ligne par ligne.

- [ ] **Step 3: créer la boîte de confirmation**

Utiliser `<dialog>` avec :

- titre transmis ;
- description explicite ;
- boutons « Annuler » et « Confirmer le retrait » ;
- restauration du focus au déclencheur ;
- fermeture par Échap ;
- aucun retrait avant confirmation.

- [ ] **Step 4: réécrire `VariantEditor`**

Nouveau contrat :

```ts
type Props = {
  productSlug: string;
  value: EditableVariant[];
  onChange: (value: EditableVariant[]) => void;
  protectedColors: string[];
  onConfirmedColorRemoval: (color: string) => void;
  disabled: boolean;
  errors?: Record<string, string[]>;
};
```

Le composant dérive couleurs et pointures sélectionnées depuis les variantes non historiques de `value`, rend les pictogrammes existants et `productSizes`, puis affiche un tableau accessible. Chaque stock met à jour la variante par sa clé couleur-pointure. Une couleur présente dans `protectedColors` ouvre toujours la confirmation avant retrait.

Une section `<details>` « SKU avancés » expose un champ SKU par cellule sans encombrer la matrice principale.

- [ ] **Step 5: préserver les variantes historiques**

Une variante `historical` retirée de la sélection est conservée dans la valeur envoyée avec `stock: 0`. Elle n’apparaît plus comme combinaison active mais reste dans la section avancée avec le badge « Historique ».

- [ ] **Step 6: intégrer au formulaire**

Passer `productSlug={value.slug}`, `protectedColors` calculé depuis les images et un callback `onConfirmedColorRemoval`. Après confirmation, le parent retire les images de cette couleur de l’état du formulaire et renormalise les positions. Supprimer la logique actuelle de réaffectation silencieuse vers une couleur de remplacement.

- [ ] **Step 7: appliquer le design Impeccable**

Ajouter :

- `.variant-selection-panel`
- `.admin-size-grid`
- `.variant-stock-matrix`
- `.variant-stock-cell`
- `.variant-advanced`

Inclure états hover, focus-visible, checked, disabled, error et loading ; permettre un défilement horizontal de la matrice sur mobile sans réduire les cibles sous 44 px.

- [ ] **Step 8: passer les tests**

Run: `pnpm exec vitest run tests/unit/variant-editor.test.tsx tests/unit/admin-product-form-design.test.tsx tests/unit/touch-targets.test.ts`

Expected: PASS.

- [ ] **Step 9: commit**

```bash
git add components/admin/variant-editor.tsx components/admin/confirm-removal-dialog.tsx components/admin/product-form.tsx app/globals.css tests/unit/variant-editor.test.tsx tests/unit/admin-product-form-design.test.tsx tests/unit/touch-targets.test.ts
git commit -m "feat: replace variant rows with stock matrix"
```

## Task 7: Galeries d’images par couleur

**Files:**
- Create: `lib/catalog/product-image-groups.ts`
- Create: `components/admin/product-image-groups.tsx`
- Modify: `components/admin/product-form.tsx`
- Modify: `lib/validation/product.ts`
- Modify: `app/globals.css`
- Create: `tests/unit/product-image-groups.test.tsx`
- Modify: `tests/unit/product-validation.test.ts`
- Modify: `tests/unit/admin-product-form-design.test.tsx`

- [ ] **Step 1: écrire les tests en échec**

```ts
it("accepte six images pour une couleur et rejette la septième", () => {
  expect(parseProduct(withImages("Noir", 6)).success).toBe(true);
  expect(parseProduct(withImages("Noir", 7)).success).toBe(false);
});

it("autorise plus de dix images si chaque couleur reste sous six", () => {
  expect(parseProduct({
    ...valid,
    images: [...imagesFor("Noir", 6), ...imagesFor("Cognac", 6)],
  }).success).toBe(true);
});
```

Le test React vérifie les onglets Noir/Cognac, le compteur « 6 images sur 6 », l’input multiple associé à la couleur active et le bouton de suppression accessible.

- [ ] **Step 2: confirmer l’échec**

Run: `pnpm exec vitest run tests/unit/product-validation.test.ts tests/unit/product-image-groups.test.tsx`

Expected: FAIL, limite globale actuelle de dix et composant absent.

- [ ] **Step 3: ajouter les helpers de groupe**

```ts
export const MAX_IMAGES_PER_COLOR = 6;

export function groupImagesByColor(images: EditableImage[], colors: string[]) {
  return colors.map((color) => ({
    color,
    images: images.filter((image) => image.color === color)
      .sort((a, b) => a.position - b.position),
  }));
}

export function normalizeImagePositions(images: EditableImage[]) {
  return images.map((image, position) => ({ ...image, position }));
}
```

- [ ] **Step 4: modifier la validation serveur**

Retirer `.max(10)` et ajouter dans `superRefine` un compteur par couleur. À partir de la septième image, ajouter une issue sur `["images", index, "color"]` avec « Maximum 6 images par couleur. ».

- [ ] **Step 5: extraire `ProductImageGroups`**

Le composant reçoit couleurs, images, callbacks d’upload, réordre, modifier et supprimer. Il rend :

- onglets/pictogrammes couleur ;
- compteur par couleur ;
- bouton d’import multiple ;
- galerie de cartes ;
- badge « Principale » sur la première image du groupe ;
- commandes monter/descendre limitées au groupe ;
- texte alternatif ;
- état limite avec bouton d’import désactivé.

- [ ] **Step 6: adapter l’upload**

`ProductForm.uploadImages` reçoit la couleur active et limite `files` à `6 - imagesDeCetteCouleur.length`. Chaque nouvelle image reçoit directement cette couleur. Après chaque mutation, appeler `normalizeImagePositions`.

- [ ] **Step 7: intégrer et retirer l’ancien rendu**

Remplacer la galerie plate de `ProductForm` par `ProductImageGroups`. La première couleur sélectionnée devient l’onglet initial. Un changement de variantes vers une liste vide remet le produit en brouillon mais ne supprime jamais silencieusement les images.

- [ ] **Step 8: appliquer les styles**

Ajouter `.admin-image-color-tabs`, `.admin-image-group`, `.admin-image-limit` et états associés, en réutilisant les cartes et boutons iconiques existants.

- [ ] **Step 9: passer les tests**

Run: `pnpm exec vitest run tests/unit/product-validation.test.ts tests/unit/product-image-groups.test.tsx tests/unit/admin-product-form-design.test.tsx`

Expected: PASS.

- [ ] **Step 10: commit**

```bash
git add lib/catalog/product-image-groups.ts components/admin/product-image-groups.tsx components/admin/product-form.tsx lib/validation/product.ts app/globals.css tests/unit/product-image-groups.test.tsx tests/unit/product-validation.test.ts tests/unit/admin-product-form-design.test.tsx
git commit -m "feat: group product images by color"
```

## Task 8: Test de non-régression des variantes historiques

**Files:**
- Modify: `tests/integration/save-product.test.ts`

- [ ] **Step 1: écrire le test de caractérisation**

Créer un produit avec deux variantes, créer une commande utilisant la première, puis sauvegarder le produit sans ces deux variantes.

Attendus :

```ts
expect(await db.productVariant.findUnique({ where: { id: ordered.id } }))
  .toMatchObject({ stock: 0 });
expect(await db.productVariant.findUnique({ where: { id: neverOrdered.id } }))
  .toBeNull();
expect(await db.orderItem.findFirst({ where: { variantId: ordered.id } }))
  .not.toBeNull();
```

- [ ] **Step 2: confirmer la garantie existante**

Run: `pnpm exec vitest run tests/integration/save-product.test.ts`

Expected: PASS. `saveProduct` distingue déjà les variantes référencées et celles qui ne le sont pas. Si le test échoue, interrompre l’exécution et diagnostiquer la régression avant toute modification.

- [ ] **Step 3: passer le test complet de sauvegarde**

Run: `pnpm exec vitest run tests/integration/save-product.test.ts`

Expected: PASS.

- [ ] **Step 4: commit**

```bash
git add tests/integration/save-product.test.ts
git commit -m "test: preserve ordered product variants"
```

## Task 9: Migration, vérification et déploiement

**Files:**
- Modify only if required by verification findings.

- [ ] **Step 1: formater et valider Prisma**

Run:

```bash
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma generate
```

Expected: toutes les commandes réussissent.

- [ ] **Step 2: vérifier la migration SQL**

Run:

```bash
pnpm exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
```

Expected: le schéma complet contient `HeroVideo`, son unicité URL et son index public.

- [ ] **Step 3: exécuter les tests unitaires complets**

Run: `pnpm exec vitest run tests/unit`

Expected: tous les tests passent.

- [ ] **Step 4: exécuter les tests d’intégration avec une base isolée**

Run: `pnpm exec vitest run tests/integration`

Expected: tous les tests passent avec une `TEST_DATABASE_URL` dont le nom de base contient `test`. Ne jamais pointer cette commande vers Neon production.

- [ ] **Step 5: lancer lint et build**

Run:

```bash
pnpm lint
pnpm build
```

Expected: aucune erreur ESLint, TypeScript ou Next.js.

- [ ] **Step 6: effectuer la QA fonctionnelle**

Vérifier sur desktop et mobile :

- upload, progression, ordre, publication et suppression des vidéos ;
- autoplay muet et transition ;
- navigation manuelle ;
- fallback sans vidéo et après erreur ;
- mouvement réduit ;
- sélection multiple couleur/pointure ;
- édition des stocks et SKU ;
- six images par couleur ;
- changement d’image par couleur sur catalogue, fiche produit et panier ;
- boutique française et arabe ;
- consultation des anciennes commandes.

- [ ] **Step 7: appliquer la migration Neon**

Run: `pnpm db:migrate`

Expected: migration `20260727120000_add_hero_videos` appliquée une seule fois.

- [ ] **Step 8: vérifier l’état Git**

Run: `git status --short && git diff --check`

Expected: arbre de travail propre et aucune erreur d’espace.

- [ ] **Step 9: pousser `master`**

Run: `git push origin master`

Expected: GitHub accepte les commits et Vercel déclenche un nouveau déploiement.
