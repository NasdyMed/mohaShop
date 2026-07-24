# Admin Image Color Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Placer les déclinaisons avant les images et imposer, pour chaque image, une couleur choisie dans la palette complète mais activée uniquement lorsqu’elle existe dans les déclinaisons.

**Architecture:** Le formulaire normalise en mémoire les anciennes images sans couleur vers la première couleur de déclinaison disponible. Le composant image utilise `productColorOptions` comme source visuelle et l’ensemble des couleurs de variantes comme source d’activation. La validation serveur exige désormais une couleur non vide appartenant aux déclinaisons.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod, Vitest, Testing Library, CSS.

---

### Task 1: Validation obligatoire de la couleur

**Files:**
- Modify: `tests/unit/product-validation.test.ts`
- Modify: `lib/validation/product.ts`

- [ ] Ajouter un test qui refuse `color: null` et conserve l’acceptation d’une couleur présente dans les déclinaisons.
- [ ] Exécuter `pnpm exec vitest run tests/unit/product-validation.test.ts` et constater l’échec sur `color: null`.
- [ ] Remplacer le schéma nullable par une couleur obligatoire et conserver la validation croisée avec les variantes.
- [ ] Réexécuter le test et constater son succès.

### Task 2: Ordre des sections et palette des images

**Files:**
- Modify: `tests/unit/admin-product-form-design.test.tsx`
- Modify: `tests/unit/product-form.test.tsx`
- Modify: `components/admin/product-form.tsx`
- Modify: `app/globals.css`

- [ ] Ajouter des tests vérifiant l’ordre Informations → Déclinaisons → Images, les huit pastilles, les couleurs sans déclinaison désactivées et l’absence de « Toutes les couleurs ».
- [ ] Ajouter un test vérifiant qu’une ancienne image générale et une image importée reçoivent la première couleur disponible.
- [ ] Exécuter les tests ciblés et constater les échecs attendus.
- [ ] Déplacer `VariantEditor` avant la section Images et mettre à jour les indices `02`/`03`.
- [ ] Alimenter les pastilles avec `productColorOptions`, désactiver celles absentes des variantes et supprimer l’option générale.
- [ ] Normaliser les images sans couleur et attribuer la première couleur disponible lors de l’import.
- [ ] Ajouter les styles disabled et le message sans déclinaison.
- [ ] Réexécuter les tests ciblés et constater leur succès.

### Task 3: Compatibilité, vérification et livraison

**Files:**
- Modify: `docs/superpowers/plans/2026-07-24-admin-image-color-order.md`

- [ ] Exécuter `pnpm exec vitest run tests/unit --maxWorkers=2`.
- [ ] Exécuter `pnpm lint`.
- [ ] Exécuter `pnpm build`.
- [ ] Vérifier visuellement `/admin/produits/nouveau` après authentification disponible, ou contrôler le rendu avec les tests DOM si l’authentification bloque.
- [ ] Commit avec `feat: align image colors with product variants`.
- [ ] Push sur `origin/master`.
