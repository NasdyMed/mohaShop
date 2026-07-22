# Compact Catalog Quick Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher un catalogue compact à quatre colonnes avec filtres latéraux, sélection rapide couleur/pointure, ajout au panier, vingt produits de démonstration et couverture de la pagination/du filtre admin existants.

**Architecture:** La requête serveur du catalogue expose toutes les variantes nécessaires aux cartes. Un composant client isolé `QuickVariantSelector` regroupe les variantes par couleur, gère les états épuisés et envoie la variante exacte au panier existant ; la carte garde ses liens séparés des contrôles. Le seed reste déterministe et l’administration conserve sa pagination serveur actuelle.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/PostgreSQL, CSS, Vitest, Testing Library.

---

### Task 1: Exposer les variantes sur les cartes du catalogue

**Files:**
- Modify: `lib/catalog/queries.ts`
- Create: `tests/unit/catalog-card-query.test.ts`

- [ ] **Step 1: Écrire le test en échec**

Mocker `db.product.findMany`, appeler `listVisibleProducts()` et vérifier que la requête sélectionne `id`, `sku`, `color`, `size`, `stock`, sans filtre `stock > 0`, avec un tri couleur/pointure. Vérifier aussi que `available` vaut `true` seulement si une variante possède un stock positif.

```ts
expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
  select: expect.objectContaining({
    variants: {
      orderBy: [{ color: "asc" }, { size: "asc" }],
      select: { id: true, sku: true, color: true, size: true, stock: true },
    },
  }),
}));
expect(result[0].variants).toHaveLength(2);
expect(result[0].available).toBe(true);
```

- [ ] **Step 2: Vérifier RED**

Run: `pnpm exec vitest run tests/unit/catalog-card-query.test.ts`
Expected: FAIL car `CatalogProductCard` ne contient pas `variants` et la requête ne sélectionne qu’une variante en stock.

- [ ] **Step 3: Modifier le contrat et la requête**

Ajouter `variants: CatalogVariant[]` à `CatalogProductCard`, sélectionner toutes les variantes triées et calculer :

```ts
return products.map(({ images, variants, ...product }) => ({
  ...product,
  image: images[0] ?? null,
  variants,
  available: variants.some((variant) => variant.stock > 0),
}));
```

Dans `getVisibleProduct`, éviter de redéfinir `variants` et conserver le même contrat.

- [ ] **Step 4: Vérifier GREEN**

Run: `pnpm exec vitest run tests/unit/catalog-card-query.test.ts tests/unit/product-purchase.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/catalog/queries.ts tests/unit/catalog-card-query.test.ts
git commit -m "feat: expose catalog variants for quick add"
```

### Task 2: Créer le sélecteur rapide couleur et pointure

**Files:**
- Create: `components/shop/quick-variant-selector.tsx`
- Create: `lib/catalog/color-swatches.ts`
- Create: `tests/unit/quick-variant-selector.test.tsx`
- Create: `tests/unit/color-swatches.test.ts`

- [ ] **Step 1: Écrire les tests couleur en échec**

Définir l’API souhaitée :

```ts
expect(colorSwatch(" Noir ")).toEqual({ background: "#24211f", known: true });
expect(colorSwatch("Cognac")).toEqual({ background: "#965d35", known: true });
expect(colorSwatch("Ultraviolet")).toEqual({ background: "#b8afa6", known: false });
```

- [ ] **Step 2: Vérifier RED puis implémenter le mapping minimal**

Run: `pnpm exec vitest run tests/unit/color-swatches.test.ts`
Expected: FAIL car le module n’existe pas.

Implémenter une normalisation `trim().toLocaleLowerCase("fr")` et une table pour Noir, Cognac, Marron, Sable, Beige, Blanc, Gris et Bleu. Toute valeur inconnue retourne le neutre `#b8afa6` avec `known: false`.

- [ ] **Step 3: Écrire les tests du composant en échec**

Rendre le composant sous `CartProvider` avec des variantes multi-couleurs et vérifier :

```tsx
expect(screen.getByRole("button", { name: "Choisir une taille" })).toBeEnabled();
fireEvent.click(screen.getByRole("button", { name: "Choisir une taille" }));
expect(screen.getByRole("radio", { name: "Cognac" })).toBeChecked();
expect(screen.getByRole("radio", { name: "Pointure 42 — épuisée" })).toBeDisabled();
expect(screen.getByRole("radio", { name: "Noir — épuisée" })).toBeDisabled();
```

Sélectionner Cognac puis 40, cliquer « Ajouter au panier » et vérifier via une sonde du panier que `variantId`, couleur, pointure, stock et quantité 1 sont corrects. Vérifier qu’un produit totalement épuisé n’affiche pas le bouton d’ouverture et annonce « Rupture de stock ».

- [ ] **Step 4: Vérifier RED**

Run: `pnpm exec vitest run tests/unit/quick-variant-selector.test.tsx`
Expected: FAIL car le composant n’existe pas.

- [ ] **Step 5: Implémenter `QuickVariantSelector`**

Le composant reçoit :

```ts
type QuickVariantSelectorProps = {
  product: {
    slug: string;
    name: string;
    imageUrl: string | null;
    unitPriceDh: number;
  };
  variants: CatalogVariant[];
};
```

Grouper les variantes par couleur avec `Map<string, CatalogVariant[]>`. Une couleur est désactivée lorsque toutes ses variantes ont `stock === 0`. Choisir initialement la première couleur disponible, mais aucune pointure. Après choix d’une variante disponible, appeler :

```ts
dispatch({
  type: "add",
  item: {
    variantId: variant.id,
    productSlug: product.slug,
    productName: product.name,
    imageUrl: product.imageUrl,
    size: variant.size,
    color: variant.color,
    unitPriceDh: product.unitPriceDh,
    availableStock: variant.stock,
  },
  quantity: 1,
});
```

Utiliser `fieldset`, `legend`, radios natifs visuellement stylables, `disabled`, une région `aria-live="polite"` et des boutons de 44×44 px minimum. La sélection d’une nouvelle couleur remet la pointure à zéro.

- [ ] **Step 6: Vérifier GREEN**

Run: `pnpm exec vitest run tests/unit/color-swatches.test.ts tests/unit/quick-variant-selector.test.tsx tests/unit/cart-reducer.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/shop/quick-variant-selector.tsx lib/catalog/color-swatches.ts tests/unit/quick-variant-selector.test.tsx tests/unit/color-swatches.test.ts
git commit -m "feat: add quick color and size selection"
```

### Task 3: Intégrer la grille, la colonne de filtres et les nouveaux styles

**Files:**
- Modify: `components/shop/product-card.tsx`
- Modify: `app/(shop)/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/unit/touch-targets.test.ts`
- Create: `tests/unit/catalog-layout.test.tsx`

- [ ] **Step 1: Écrire les tests structurels et de rendu en échec**

Vérifier que le catalogue rend un `<aside aria-labelledby="filters-title">`, « Filtres à venir », puis la grille. Rendre `ProductCard` et vérifier que le lien de fiche ne contient aucun bouton :

```tsx
const productLink = screen.getByRole("link", { name: "Découvrir Bottine Atlas" });
expect(productLink.querySelector("button")).toBeNull();
expect(screen.getByRole("button", { name: "Choisir une taille" })).toBeInTheDocument();
```

Dans le test CSS, vérifier une grille `repeat(4, minmax(0, 1fr))`, une mise en page avec colonne de 220 px, les breakpoints 2/1 colonnes, les classes prix/disponibilité et des cibles 44×44 pour couleur/pointure.

- [ ] **Step 2: Vérifier RED**

Run: `pnpm exec vitest run tests/unit/catalog-layout.test.tsx tests/unit/touch-targets.test.ts`
Expected: FAIL sur le bloc filtre, la grille quatre colonnes et les contrôles rapides absents.

- [ ] **Step 3: Refactorer `ProductCard` sans interactions imbriquées**

Structurer la carte ainsi : image liée, bloc nom lié, prix/badge, puis `QuickVariantSelector` frère des liens. Passer `sizes="(max-width: 760px) 100vw, (max-width: 1099px) 50vw, 25vw"` à `next/image`.

- [ ] **Step 4: Ajouter le bloc filtre et la mise en page**

Dans la page :

```tsx
<div className="catalog-layout">
  <aside className="catalog-filters" aria-labelledby="filters-title">
    <h2 id="filters-title">Filtrer par</h2>
    <p>Filtres à venir</p>
  </aside>
  <div className="catalog-results">
    <div className="product-grid">...</div>
  </div>
</div>
```

Ajouter les styles quatre colonnes à partir de 1100 px, deux entre 761 et 1099 px, une jusqu’à 760 px, avec le filtre au-dessus sur mobile. Ajouter les styles premium du panneau rapide, pastilles, états actifs/épuisés, prix et badges.

- [ ] **Step 5: Vérifier GREEN**

Run: `pnpm exec vitest run tests/unit/catalog-layout.test.tsx tests/unit/touch-targets.test.ts tests/unit/quick-variant-selector.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/shop/product-card.tsx 'app/(shop)/page.tsx' app/globals.css tests/unit/catalog-layout.test.tsx tests/unit/touch-targets.test.ts
git commit -m "feat: build compact four-column catalog"
```

### Task 4: Fournir vingt produits de démonstration déterministes

**Files:**
- Create: `prisma/seed-products.ts`
- Modify: `prisma/seed.ts`
- Create: `tests/unit/seed-products.test.ts`

- [ ] **Step 1: Écrire le test de données en échec**

Importer la constante `products` depuis `prisma/seed-products.ts` et vérifier :

```ts
expect(products).toHaveLength(20);
expect(new Set(products.map((product) => product.slug))).toHaveSize(20);
expect(new Set(products.flatMap((product) => product.variants.map((variant) => variant.sku))).size)
  .toBe(products.flatMap((product) => product.variants).length);
expect(products.some((product) => new Set(product.variants.map((variant) => variant.color)).size > 1)).toBe(true);
expect(products.some((product) => product.variants.some((variant) => variant.stock === 0))).toBe(true);
```

Vérifier aussi que chaque produit possède une description, une image HTTPS, un prix positif et au moins trois variantes.

- [ ] **Step 2: Vérifier RED**

Run: `pnpm exec vitest run tests/unit/seed-products.test.ts`
Expected: FAIL avec 2 produits au lieu de 20.

- [ ] **Step 3: Compléter les données**

Créer dans `prisma/seed-products.ts` vingt entrées littérales et stables couvrant les familles Bottine, Chelsea, Botte haute et Botte randonnée, avec prix en DH, images HTTPS autorisées, couleurs de la table et stocks variés. Utiliser exactement les identités suivantes : Atlas Cognac, Nocturne Noir, Sahara Sable, Rif Marron, Médina Beige, Toubkal Gris, Dune Cognac, Kasbah Noir, Cèdre Marron, Océan Bleu, Aube Beige, Argana Cognac, Zellige Noir, Nomade Sable, Ourika Marron, Essaouira Beige, Volubilis Noir, Akchour Gris, Majorelle Bleu et Agafay Cognac. Chaque slug et chaque SKU dérive du nom en minuscules ASCII et reste unique. Au moins Atlas, Sahara et Majorelle possèdent deux couleurs ; chaque produit possède les pointures 38 à 43, avec les pointures 42 ou 43 à stock zéro sur au moins dix produits.

Importer `products` dans `prisma/seed.ts`. Conserver les `upsert` produit/image/variante existants pour qu’une seconde exécution ne crée aucun doublon et ne jamais exécuter `main()` lors de l’import du fichier de données par les tests.

- [ ] **Step 4: Vérifier GREEN**

Run: `pnpm exec vitest run tests/unit/seed-products.test.ts tests/unit/product-image-url.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed-products.ts prisma/seed.ts tests/unit/seed-products.test.ts
git commit -m "test: seed twenty catalog products"
```

### Task 5: Verrouiller pagination et filtre de statut administrateur

**Files:**
- Create: `tests/unit/admin-orders-query.test.ts`
- Create: `tests/unit/admin-orders-page.test.tsx`
- Modify: `app/admin/(protected)/commandes/page.tsx`
- Modify: `lib/orders/admin-queries.ts`

- [ ] **Step 1: Écrire les tests en échec ou caractérisation**

Mocker la base et vérifier `take: 20`, le calcul de `skip`, le statut valide, le statut invalide ignoré et la page ramenée dans les limites. Mocker `listAdminOrders` pour rendre la page et vérifier que les liens de pagination conservent `status=CONFIRMED` et `q=Sara`.

```ts
expect(screen.getByRole("link", { name: "Suivant" }))
  .toHaveAttribute("href", "/admin/commandes?q=Sara&status=CONFIRMED&page=2");
```

- [ ] **Step 2: Exécuter les tests**

Run: `pnpm exec vitest run tests/unit/admin-orders-query.test.ts tests/unit/admin-orders-page.test.tsx`
Expected: les comportements déjà corrects passent ; tout écart sur conservation des paramètres ou bornage échoue.

- [ ] **Step 3: Appliquer uniquement les corrections révélées**

Conserver `PAGE_SIZE = 20`, la validation via `OrderStatus`, la transaction `RepeatableRead` et la fonction `href`. Ne modifier le code de production que si un test de caractérisation révèle un écart. Reformater la page en JSX lisible sans changer la logique.

- [ ] **Step 4: Vérifier GREEN**

Run: `pnpm exec vitest run tests/unit/admin-orders-query.test.ts tests/unit/admin-orders-page.test.tsx tests/unit/order-status.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/admin-orders-query.test.ts tests/unit/admin-orders-page.test.tsx 'app/admin/(protected)/commandes/page.tsx' lib/orders/admin-queries.ts
git commit -m "test: cover admin order pagination filters"
```

### Task 6: Vérification complète et responsive

**Files:**
- Modify only if a verification exposes a defect in the files above.

- [ ] **Step 1: Exécuter la vérification automatisée**

Run:

```bash
pnpm exec vitest run tests/unit
pnpm lint
pnpm build
```

Expected: 0 échec, code de sortie 0 pour chaque commande.

- [ ] **Step 2: Vérifier visuellement le catalogue**

Lancer `pnpm dev` et contrôler `/` aux largeurs 1440×900, 1024×900 et 390×844 : quatre/deux/une colonnes, filtre à gauche puis au-dessus, aucune troncature du prix, panneau rapide utilisable et cibles tactiles lisibles.

- [ ] **Step 3: Vérifier les interactions**

Sélectionner une couleur disponible, constater la mise à jour des pointures, vérifier qu’une couleur totalement épuisée et une pointure épuisée sont désactivées, ajouter une variante et confirmer l’incrément du panier. Vérifier `/admin/commandes?status=CONFIRMED` et la conservation du statut en pagination.

- [ ] **Step 4: Vérifier l’intégration PostgreSQL si une base isolée existe**

Run: `pnpm test` uniquement avec `TEST_DATABASE_URL` pointant vers une base isolée dont le nom contient `test`.
Expected: 0 échec. Sans cette variable, rapporter explicitement que les tests d’intégration restent non exécutés.

- [ ] **Step 5: Commit de correction éventuel**

Si la vérification a exigé une correction, ajouter uniquement les fichiers corrigés et créer :

```bash
git commit -m "fix: polish catalog quick add"
```
