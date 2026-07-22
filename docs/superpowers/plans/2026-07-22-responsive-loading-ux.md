# Responsive Loading UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Empêcher le débordement du titre de connexion et rendre toutes les opérations lentes principales visibles, accessibles et résistantes aux doubles soumissions.

**Architecture:** Un petit composant `LoadingLabel` centralise le spinner et son texte, tandis que chaque formulaire conserve son propre état asynchrone et l’expose via `aria-busy`. Des frontières `loading.tsx` fournissent un retour non bloquant pendant les navigations Next.js, sans modifier la logique métier.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS, Vitest, Testing Library.

---

### Task 1: Composant de chargement et typographie responsive

**Files:**
- Create: `components/ui/loading-label.tsx`
- Modify: `app/globals.css`
- Create: `tests/unit/loading-ux.test.tsx`
- Modify: `tests/unit/touch-targets.test.ts`

- [ ] **Step 1: Écrire les tests en échec**

Tester que `LoadingLabel` rend un statut lisible et un spinner masqué aux technologies d’assistance, et que la règle `.admin-login-card h1` utilise une taille responsive liée au conteneur, une hauteur de ligne et une rupture sûre.

```tsx
render(<LoadingLabel>Connexion en cours…</LoadingLabel>);
expect(screen.getByRole("status")).toHaveTextContent("Connexion en cours…");
expect(screen.getByTestId("loading-spinner")).toHaveAttribute("aria-hidden", "true");
```

- [ ] **Step 2: Vérifier RED**

Run: `pnpm exec vitest run tests/unit/loading-ux.test.tsx tests/unit/touch-targets.test.ts`
Expected: FAIL car `LoadingLabel` et les règles responsive n’existent pas.

- [ ] **Step 3: Implémenter le composant minimal**

```tsx
export function LoadingLabel({ children }: { children: React.ReactNode }) {
  return <span className="loading-label" role="status"><span className="loading-spinner" data-testid="loading-spinner" aria-hidden="true" />{children}</span>;
}
```

Ajouter les styles `.loading-label`, `.loading-spinner`, l’animation respectueuse de `prefers-reduced-motion`, puis remplacer la taille du titre par une règle dédiée du type `font-size: clamp(2.25rem, 12cqi, 4.5rem); line-height: .95; overflow-wrap: anywhere`, avec `container-type: inline-size` sur la carte.

- [ ] **Step 4: Vérifier GREEN**

Run: `pnpm exec vitest run tests/unit/loading-ux.test.tsx tests/unit/touch-targets.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/loading-label.tsx app/globals.css tests/unit/loading-ux.test.tsx tests/unit/touch-targets.test.ts
git commit -m "fix: make admin title responsive"
```

### Task 2: Retours cohérents sur toutes les actions lentes

**Files:**
- Modify: `app/admin/connexion/login-form.tsx`
- Modify: `components/cart/checkout-form.tsx`
- Modify: `components/admin/order-status-form.tsx`
- Modify: `components/admin/product-form.tsx`
- Modify: `tests/unit/login-form.test.tsx`
- Modify: `tests/unit/checkout-form.test.tsx`
- Modify: `tests/unit/order-status-form.test.tsx`
- Modify: `tests/unit/product-form.test.tsx`

- [ ] **Step 1: Écrire les assertions en échec**

Pour chaque action, garder sa promesse en attente puis vérifier : `aria-busy="true"`, contrôles désactivés, statut visible et libellé exact. Résoudre/rejeter ensuite la promesse et vérifier le succès ou le retour à l’état actif.

```tsx
expect(form).toHaveAttribute("aria-busy", "true");
expect(screen.getByRole("status")).toHaveTextContent("Connexion en cours…");
expect(screen.getByRole("button", { name: "Connexion en cours…" })).toBeDisabled();
```

Répéter avec « Commande en cours… », « Mise à jour… », « Enregistrement… » et « Téléversement… ».

- [ ] **Step 2: Vérifier RED**

Run: `pnpm exec vitest run tests/unit/login-form.test.tsx tests/unit/checkout-form.test.tsx tests/unit/order-status-form.test.tsx tests/unit/product-form.test.tsx`
Expected: FAIL sur le statut/spinner ou `aria-busy` manquant.

- [ ] **Step 3: Brancher `LoadingLabel` sur les états existants**

Pour chaque formulaire, ajouter `aria-busy={pendingOrLocked}` et rendre :

```tsx
{pending ? <LoadingLabel>Connexion en cours…</LoadingLabel> : "Se connecter"}
```

Utiliser les états déjà présents (`pending`, `busy`, `uploading`) et conserver les verrous et chemins d’erreur existants. Le téléversement affiche son statut dans son contrôle dédié ; sauvegarde et téléversement ne partagent pas un libellé ambigu.

- [ ] **Step 4: Vérifier GREEN et absence de régression**

Run: `pnpm exec vitest run tests/unit/login-form.test.tsx tests/unit/checkout-form.test.tsx tests/unit/order-status-form.test.tsx tests/unit/product-form.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/admin/connexion/login-form.tsx components/cart/checkout-form.tsx components/admin/order-status-form.tsx components/admin/product-form.tsx tests/unit/login-form.test.tsx tests/unit/checkout-form.test.tsx tests/unit/order-status-form.test.tsx tests/unit/product-form.test.tsx
git commit -m "feat: show progress for slow actions"
```

### Task 3: Chargement de navigation et validation complète

**Files:**
- Create: `app/(shop)/loading.tsx`
- Create: `app/admin/loading.tsx`
- Create: `tests/unit/navigation-loading.test.tsx`

- [ ] **Step 1: Écrire le test de rendu en échec**

```tsx
render(<ShopLoading />);
expect(screen.getByRole("status")).toHaveTextContent("Chargement de la boutique…");
render(<AdminLoading />);
expect(screen.getByRole("status")).toHaveTextContent("Chargement de l’administration…");
```

- [ ] **Step 2: Vérifier RED**

Run: `pnpm exec vitest run tests/unit/navigation-loading.test.tsx`
Expected: FAIL car les frontières n’existent pas.

- [ ] **Step 3: Créer les frontières non bloquantes**

Chaque `loading.tsx` rend un `<main className="route-loading" aria-busy="true"><LoadingLabel>…</LoadingLabel></main>` avec le texte français propre à sa section.

- [ ] **Step 4: Vérifier GREEN puis toute la branche**

Run:

```bash
pnpm exec vitest run tests/unit
pnpm lint
pnpm build
```

Expected: toutes les commandes sortent avec code 0.

- [ ] **Step 5: Vérifier visuellement**

Lancer `pnpm dev`, ouvrir `/admin/connexion` à environ 785×756 puis à 390×844, et confirmer que « Administration » reste dans la carte. Déclencher chaque action lente et confirmer que le spinner, le texte, la désactivation et la reprise sur erreur sont visibles.

- [ ] **Step 6: Commit**

```bash
git add app/(shop)/loading.tsx app/admin/loading.tsx tests/unit/navigation-loading.test.tsx
git commit -m "feat: add route loading feedback"
```
