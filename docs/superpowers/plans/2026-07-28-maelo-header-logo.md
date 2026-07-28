# Maelo Header Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher le logo Maelo fourni dans les en-têtes public et administrateur.

**Architecture:** Un composant partagé `BrandLogo` rend l’image optimisée avec ses dimensions intrinsèques. Les deux liens d’en-tête conservent leur navigation et utilisent ce composant, tandis que le CSS contrôle uniquement sa taille d’affichage responsive.

**Tech Stack:** Next.js, `next/image`, React, CSS, Vitest, Testing Library.

---

### Task 1: Composant et tests

**Files:**
- Create: `components/brand-logo.tsx`
- Modify: `tests/unit/storefront-shell.test.tsx`
- Create: `tests/unit/admin-layout.test.tsx`

- [ ] Écrire les tests qui attendent une image accessible nommée `Maelo` dans les deux liens et l’absence du texte rendu `Maison Botte`.
- [ ] Exécuter `pnpm exec vitest run tests/unit/storefront-shell.test.tsx tests/unit/admin-layout.test.tsx --reporter=dot` et constater l’échec.
- [ ] Créer `BrandLogo` avec `Image`, `src="/brand/maelo-logo.png"`, `alt="Maelo"`, `width={127}` et `height={79}`.

### Task 2: Asset, intégration et styles

**Files:**
- Create: `public/brand/maelo-logo.png`
- Modify: `components/shop/storefront-shell.tsx`
- Modify: `app/admin/(protected)/layout.tsx`
- Modify: `app/globals.css`

- [ ] Copier l’image fournie sans transformation dans `public/brand/maelo-logo.png`.
- [ ] Remplacer le texte de chaque lien `.brand` par `<BrandLogo />`.
- [ ] Ajouter `.brand-logo { display: block; width: 96px; height: auto; }` et une largeur mobile de `78px`.
- [ ] Vérifier les tests ciblés, le lint et le build.
- [ ] Commit et push sur `master`.
