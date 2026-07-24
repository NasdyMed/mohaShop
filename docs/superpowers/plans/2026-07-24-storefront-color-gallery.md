# Storefront Color Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchroniser les couleurs et images dans le catalogue et ajouter une galerie à miniatures sur la fiche produit.

**Architecture:** Les requêtes catalogue exposent toutes les images aux cartes. La carte devient un composant client qui partage la couleur active entre son image et son sélecteur rapide. La galerie produit devient interactive et maintient l’image active dans la liste filtrée pour la couleur choisie.

**Tech Stack:** Next.js 16, React 19, TypeScript, Next Image, Vitest, Testing Library, CSS.

---

### Task 1: Données d’images des cartes

**Files:**
- Modify: `lib/catalog/queries.ts`
- Modify: `tests/unit/catalog-card-query.test.ts`

- [ ] Ajouter un test exigeant toutes les images dans `CatalogProductCard`.
- [ ] Vérifier l’échec du test.
- [ ] Retourner `images` avec la couverture calculée.
- [ ] Vérifier le succès du test.

### Task 2: Couleurs et image dynamique des cartes

**Files:**
- Modify: `components/shop/product-card.tsx`
- Modify: `components/shop/quick-variant-selector.tsx`
- Modify: `tests/unit/quick-variant-selector.test.tsx`
- Modify: `tests/unit/catalog-layout.test.tsx`

- [ ] Tester l’affichage permanent des couleurs, l’état épuisé et le callback couleur.
- [ ] Tester le changement d’image de carte et l’image ajoutée au panier.
- [ ] Vérifier les échecs.
- [ ] Partager la couleur active et choisir l’image correspondante.
- [ ] Garder les pastilles visibles lorsque le panneau de tailles est fermé.
- [ ] Vérifier les succès.

### Task 3: Galerie produit à miniatures

**Files:**
- Modify: `components/shop/product-gallery.tsx`
- Modify: `tests/unit/product-gallery.test.tsx`
- Modify: `app/globals.css`

- [ ] Tester la grande image initiale, les boutons miniatures et leur changement.
- [ ] Tester la réinitialisation lors d’un changement de couleur.
- [ ] Vérifier les échecs.
- [ ] Ajouter l’état de l’image active et la colonne de miniatures.
- [ ] Ajouter les styles desktop, mobile, sélection, focus et rupture.
- [ ] Vérifier les succès.

### Task 4: Vérification et livraison

**Files:**
- Modify: `docs/superpowers/plans/2026-07-24-storefront-color-gallery.md`

- [ ] Exécuter tous les tests unitaires.
- [ ] Exécuter le lint et le build.
- [ ] Vérifier visuellement le catalogue et une fiche produit.
- [ ] Commit et push sur `master`.
