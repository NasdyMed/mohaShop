# Nike-style Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild collection cards and the product detail shopping surface using the layout and interaction patterns in the approved Nike-style reference.

**Architecture:** Keep catalog data and cart behavior unchanged. Move collection cards to a presentation-first component with color-only interaction, extend the detail variant picker with color-image tiles, and reshape the gallery/detail CSS around a thumbnail rail and three-column size grid.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS, Vitest, Testing Library

---

### Task 1: Collection card anatomy

**Files:**
- Modify: `components/shop/product-card.tsx`
- Modify: `components/shop/quick-variant-selector.tsx`
- Modify: `app/globals.css`
- Test: `tests/unit/catalog-layout.test.tsx`
- Test: `tests/unit/quick-variant-selector.test.tsx`

- [ ] **Step 1: Write failing collection-card tests**

Assert that a card renders its color radios, product name, `Botte` category, and
price, while omitting `Choisir une taille`, `Ajouter au panier`, and
`Voir le modèle`.

```tsx
expect(screen.getByRole("radio", { name: "Noir" })).toBeInTheDocument();
expect(screen.getByText("Botte")).toBeInTheDocument();
expect(screen.queryByRole("button", { name: "Choisir une taille" })).toBeNull();
expect(screen.queryByText("Voir le modèle")).toBeNull();
```

- [ ] **Step 2: Run tests and confirm RED**

Run:

```bash
pnpm exec vitest run tests/unit/catalog-layout.test.tsx tests/unit/quick-variant-selector.test.tsx --maxWorkers=2
```

Expected: failures because the current card includes quick size/add controls and
the secondary detail row.

- [ ] **Step 3: Implement a dedicated color swatch selector**

Change the quick selector to render only grouped color radios and notify
`ProductCard` through `onColorChange`. Keep unavailable colors disabled and
struck through. Remove cart and size responsibilities from this collection-only
component.

- [ ] **Step 4: Implement the reference card layout**

Render this anatomy:

```tsx
<article className="product-card">
  <Link className="product-card-media-link">...</Link>
  <div className="product-card-copy">
    <QuickVariantSelector variants={product.variants} onColorChange={setSelectedColor} />
    <Link className="product-card-name"><h2>{product.name}</h2></Link>
    <p className="product-card-category">Botte</p>
    <strong className="product-card-price">{formatPriceDh(product.priceDh)}</strong>
  </div>
</article>
```

Style the image stage with a neutral square surface, remove elevation and
decorative gradients, and keep the card information left-aligned.

- [ ] **Step 5: Run tests and confirm GREEN**

Run the command from Step 2. Expected: all selected tests pass.

### Task 2: Image-based product colors

**Files:**
- Modify: `components/shop/variant-picker.tsx`
- Modify: `components/cart/product-purchase.tsx`
- Modify: `components/shop/product-detail-experience.tsx`
- Modify: `app/globals.css`
- Test: `tests/unit/variant-picker.test.tsx`
- Test: `tests/unit/product-purchase.test.tsx`

- [ ] **Step 1: Write failing color-tile tests**

Pass product images to `VariantPicker` and assert that available color controls
contain the matching image, unavailable colors remain disabled, and a missing
color image falls back to a swatch.

```tsx
expect(screen.getByRole("radio", { name: "Noir" }).closest("label"))
  .toHaveTextContent("Noir");
expect(screen.getByRole("img", { name: "" }))
  .toHaveAttribute("data-src", "/noir.jpg");
expect(screen.getByRole("radio", { name: "Beige — Rupture de stock" }))
  .toBeDisabled();
```

- [ ] **Step 2: Run tests and confirm RED**

Run:

```bash
pnpm exec vitest run tests/unit/variant-picker.test.tsx tests/unit/product-purchase.test.tsx --maxWorkers=2
```

Expected: failures because `VariantPicker` does not accept images or render
image tiles.

- [ ] **Step 3: Add image props through the purchase components**

Use these signatures:

```ts
type VariantPickerProps = {
  variants: readonly CatalogVariant[];
  images?: readonly CatalogImage[];
  onSelect?: (variant: CatalogVariant | null) => void;
};
```

Pass `product.images` from `ProductDetailExperience` to `ProductPurchase`, then
to `VariantPicker`. Resolve each color's first image using exact color match,
then render a color swatch when absent.

- [ ] **Step 4: Style color image tiles**

Use an 88-by-88 pixel neutral tile with a strong selected border. Keep disabled
tiles visible at reduced opacity with a diagonal strike. Expose the color name
below the image or swatch.

- [ ] **Step 5: Run tests and confirm GREEN**

Run the command from Step 2. Expected: all selected tests pass.

### Task 3: Product detail layout and size grid

**Files:**
- Modify: `components/shop/product-detail-experience.tsx`
- Modify: `components/shop/product-gallery.tsx`
- Modify: `components/shop/variant-picker.tsx`
- Modify: `app/globals.css`
- Test: `tests/unit/product-gallery.test.tsx`
- Test: `tests/unit/variant-picker.test.tsx`
- Test: `tests/unit/product-purchase.test.tsx`

- [ ] **Step 1: Write failing detail-layout tests**

Assert that the gallery keeps thumbnail switching, the detail page exposes the
new category hierarchy, sizes display the `EU` prefix, and the size grid has a
dedicated class.

```tsx
expect(screen.getByText("Botte")).toBeInTheDocument();
expect(screen.getByText("EU 40")).toBeInTheDocument();
expect(container.querySelector(".size-option-grid")).toBeInTheDocument();
```

- [ ] **Step 2: Run tests and confirm RED**

Run:

```bash
pnpm exec vitest run tests/unit/product-gallery.test.tsx tests/unit/variant-picker.test.tsx tests/unit/product-purchase.test.tsx --maxWorkers=2
```

Expected: failures because sizes currently omit `EU` and the reference layout
classes do not exist.

- [ ] **Step 3: Implement detail anatomy**

Remove the editorial eyebrow/index treatments from the shopping surface. Place
gallery and product information in a clean two-column layout. Keep product name,
`Botte`, price, image color tiles, size selector, stock, quantity, add-to-cart,
and service notes in that order.

- [ ] **Step 4: Implement gallery and size CSS**

Keep the 76-to-80 pixel vertical thumbnail rail and large neutral main stage.
Render sizes as a three-column grid, with selected, focus, and disabled states.
At 760 pixels stack the detail page, move thumbnails to a horizontal row, and
reduce sizes to two columns only on very narrow screens.

- [ ] **Step 5: Run tests and confirm GREEN**

Run the command from Step 2. Expected: all selected tests pass.

### Task 4: Regression and visual verification

**Files:**
- Modify if required: files from Tasks 1–3

- [ ] **Step 1: Run all unit tests**

```bash
pnpm exec vitest run tests/unit --maxWorkers=2
```

Expected: all unit tests pass.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: exit code 0.

- [ ] **Step 3: Run the production build**

```bash
pnpm build
```

Expected: compilation and TypeScript checks succeed.

- [ ] **Step 4: Verify in the local browser**

Check the collection and one product page at desktop and mobile widths. Confirm
image changes, thumbnail switching, disabled color/size states, default
selection, and responsive stacking.

- [ ] **Step 5: Commit and push**

```bash
git add app/globals.css components/shop tests/unit docs/superpowers/plans/2026-07-24-nike-style-storefront.md
git commit -m "feat: redesign storefront in nike-style layout"
git push origin master
```

