# Product Color Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à chaque image produit d’être générale ou associée à une couleur, avec import Vercel Blob dans l’admin et galerie synchronisée sur la couleur choisie.

**Architecture:** `ProductImage.color` reste nullable : `null` signifie « Toutes les couleurs ». L’admin importe plusieurs fichiers via l’action Blob existante, choisit la couleur par pastilles issues des variantes, puis sauvegarde cette association. La fiche produit possède un état client partagé entre le sélecteur de variante et une galerie qui priorise les images de la couleur active puis les images générales.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma/PostgreSQL, Vercel Blob, Vitest/Testing Library.

---

### Task 1: Modèle et validation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260724120000_add_product_image_color/migration.sql`
- Modify: `lib/validation/product.ts`
- Modify: `tests/unit/product-validation.test.ts`

- [ ] Ajouter un test qui accepte `color: null`, accepte une couleur de variante et refuse une couleur inconnue.
- [ ] Exécuter le test et vérifier son échec.
- [ ] Ajouter `color String?` à `ProductImage`, la migration SQL et la validation croisée.
- [ ] Exécuter le test et vérifier son succès.

### Task 2: Persistance et requêtes catalogue

**Files:**
- Modify: `lib/catalog/admin-mutations.ts`
- Modify: `lib/catalog/admin-queries.ts`
- Modify: `lib/catalog/queries.ts`
- Modify: `tests/integration/save-product.test.ts`
- Modify: `tests/unit/catalog-card-query.test.ts`

- [ ] Ajouter les attentes sur la persistance de la couleur et le choix de couverture correspondant à la première couleur disponible.
- [ ] Exécuter les tests et vérifier leur échec.
- [ ] Persister/sélectionner `color` et choisir la couverture avec repli sur une image générale puis la première image.
- [ ] Exécuter les tests et vérifier leur succès.

### Task 3: Import et association couleur dans l’admin

**Files:**
- Modify: `components/admin/product-form.tsx`
- Modify: `app/admin/(protected)/produits/[id]/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/unit/product-form.test.tsx`
- Modify: `tests/unit/admin-product-form-design.test.tsx`

- [ ] Ajouter les tests d’import multiple, d’état de chargement, d’erreur et d’association par pastilles.
- [ ] Exécuter les tests et vérifier leur échec.
- [ ] Activer l’input JPEG/PNG/WebP multiple, appeler l’action Blob, ajouter les aperçus et le sélecteur « Toutes les couleurs »/pastilles.
- [ ] Exécuter les tests et vérifier leur succès.

### Task 4: Galerie synchronisée

**Files:**
- Create: `components/shop/product-detail-experience.tsx`
- Modify: `components/shop/product-gallery.tsx`
- Modify: `components/cart/product-purchase.tsx`
- Modify: `app/(shop)/produits/[slug]/page.tsx`
- Modify: `tests/unit/product-purchase.test.tsx`
- Create: `tests/unit/product-gallery.test.tsx`

- [ ] Ajouter les tests prouvant la sélection par défaut et le changement d’image lors d’un changement de couleur.
- [ ] Exécuter les tests et vérifier leur échec.
- [ ] Partager la variante sélectionnée et filtrer/prioriser les images par couleur, avec repli général.
- [ ] Exécuter les tests et vérifier leur succès.

### Task 5: Vérification et livraison

**Files:**
- Modify: `docs/superpowers/plans/2026-07-24-product-color-images.md`

- [ ] Exécuter `pnpm exec prisma generate`.
- [ ] Exécuter les tests unitaires et d’intégration disponibles.
- [ ] Exécuter `pnpm lint` puis `pnpm build`.
- [ ] Tester visuellement l’admin et la fiche produit.
- [ ] Vérifier sans exposer de secret si le projet local est lié à Vercel et si `BLOB_READ_WRITE_TOKEN` est présent.
- [ ] Commit et push sur `master`.
