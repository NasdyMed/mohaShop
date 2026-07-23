# Storefront Impeccable Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refaire l’accueil, les cartes catalogue et la fiche produit avec le système Impeccable et une variante sélectionnée par défaut.

**Architecture:** Les requêtes catalogue restent inchangées. La présentation serveur choisit l’image du hero, tandis que `VariantPicker` reste l’unique source de vérité client pour la couleur, la pointure et la variante active. Les tokens storefront sont centralisés dans `globals.css`.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS, Vitest, Testing Library.

---

### Task 1: Default product variant selection

**Files:**
- Modify: `components/shop/variant-picker.tsx`
- Modify: `tests/unit/variant-picker.test.tsx`

- [ ] Ajouter un test qui attend la première couleur en stock et sa première pointure cochées au rendu, avec `onSelect` appelé pour la variante correspondante.
- [ ] Exécuter `pnpm exec vitest run tests/unit/variant-picker.test.tsx` et confirmer l’échec sur l’absence de sélection.
- [ ] Initialiser couleur et pointure depuis la première variante avec `stock > 0`; lors d’un changement de couleur, sélectionner sa première pointure en stock.
- [ ] Remplacer le texte couleur visible par une pastille utilisant `colorSwatch`, tout en conservant `aria-label`.
- [ ] Relancer le test et confirmer sa réussite.

### Task 2: Impeccable homepage

**Files:**
- Modify: `app/(shop)/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/unit/catalog-layout.test.tsx`

- [ ] Ajouter des assertions pour l’image/visuel hero, le lien `#collection` et les trois garanties.
- [ ] Exécuter le test et confirmer l’échec.
- [ ] Choisir le premier produit avec image comme produit hero et construire le hero asymétrique, le CTA et le bandeau de garanties.
- [ ] Ajouter les styles responsive avec les tokens `--store-primary`, `--store-secondary`, `--store-success`, `--store-surface`.
- [ ] Relancer le test et confirmer sa réussite.

### Task 3: Product cards and detail page

**Files:**
- Modify: `components/shop/product-card.tsx`
- Modify: `app/(shop)/produits/[slug]/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/unit/catalog-layout.test.tsx`
- Modify: `tests/unit/product-purchase.test.tsx`

- [ ] Ajouter des assertions structurelles sur les cartes éditoriales et le panneau d’achat de la fiche.
- [ ] Exécuter les tests ciblés et confirmer l’échec.
- [ ] Ajouter numéro éditorial, CTA de découverte et hiérarchie prix/disponibilité aux cartes sans imbriquer d’interactions.
- [ ] Recomposer la fiche en galerie et panneau sticky, avec garanties de paiement/livraison.
- [ ] Relancer les tests ciblés et confirmer leur réussite.

### Task 4: Verification and commit

**Files:**
- Verify all modified files.

- [ ] Exécuter `pnpm exec vitest run tests/unit` et attendre zéro échec.
- [ ] Exécuter `pnpm lint` et attendre zéro erreur.
- [ ] Exécuter `pnpm build` et attendre une compilation réussie.
- [ ] Contrôler l’accueil et une fiche produit à 1440 px puis à 640 px.
- [ ] Commiter avec `git commit -m "feat: redesign Impeccable storefront"`.
