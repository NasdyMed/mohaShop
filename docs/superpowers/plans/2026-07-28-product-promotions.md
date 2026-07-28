# Product Promotions Implementation Plan

> **For Codex:** Implement this plan task by task, keeping `priceDh` as the only charged price.

**Goal:** Add an optional product-level reference price so promoted products display a crossed-out old price, a final price, a discount badge, and localized savings.

**Architecture:** Store the final selling price in the existing `Product.priceDh` field and add nullable `Product.compareAtPriceDh`. Centralize promotion calculations in a small catalog helper, expose the new value through admin/catalog queries, and render it through a shared price component. Orders continue snapshotting only `priceDh`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma/PostgreSQL, Vitest, Testing Library.

---

### Task 1: Define promotion calculations

**Files:**
- Create: `lib/catalog/promotion.ts`
- Test: `tests/unit/promotion.test.ts`

1. Write failing tests for inactive promotions, percentage calculation, and savings.
2. Run the focused test and confirm it fails.
3. Implement the smallest pure helper returning promotion metadata only when the reference price is greater than the selling price.
4. Run the focused test and confirm it passes.

### Task 2: Persist and validate the reference price

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260728_add_product_compare_at_price/migration.sql`
- Modify: `lib/validation/product.ts`
- Modify: `lib/catalog/admin-mutations.ts`
- Modify: `tests/unit/product-validation.test.ts`
- Modify: `tests/unit/product-admin-mutations.test.ts`

1. Add failing validation tests for a nullable reference price and the `compareAtPriceDh > priceDh` rule.
2. Add failing mutation assertions for create and update persistence.
3. Add the nullable Prisma field and migration.
4. Extend validation and admin mutations.
5. Generate the Prisma client and run the focused tests.

### Task 3: Add the promotion fields to the admin form

**Files:**
- Modify: `components/admin/product-form.tsx`
- Modify: `app/admin/(protected)/produits/[id]/page.tsx`
- Modify: `tests/unit/product-form.test.tsx`
- Modify: `tests/unit/save-product-action.test.ts`

1. Add failing tests for the optional old-price input, serialization, and validation feedback.
2. Rename the existing price field to `Prix de vente (DH)`.
3. Add `Prix avant promotion (DH)` and a live promotion preview.
4. Pass the field through edit-page initial values and save actions.
5. Run the focused admin tests.

### Task 4: Expose and render promotions in the storefront

**Files:**
- Modify: `lib/catalog/queries.ts`
- Create: `components/shop/product-price.tsx`
- Modify: `components/shop/product-card.tsx`
- Modify: `components/shop/product-detail-experience.tsx`
- Modify: `lib/i18n/dictionaries.ts`
- Modify: `app/globals.css`
- Modify: `tests/unit/catalog-card-query.test.ts`
- Modify: `tests/unit/catalog-layout.test.tsx`
- Modify: `tests/unit/product-detail-experience.test.tsx`

1. Add failing query and rendering tests for the reference price, promo percentage, crossed-out price, and localized savings.
2. Select `compareAtPriceDh` in card and detail queries.
3. Build the shared semantic price display using `<del>`.
4. Add the card badge and product-detail savings message.
5. Add responsive editorial styling using the existing cream, black, and burnt-orange system.
6. Run the focused storefront tests.

### Task 5: Protect checkout pricing and verify

**Files:**
- Modify: relevant order unit test only if coverage is missing.

1. Add or extend a test proving order unit prices still use `priceDh`, never `compareAtPriceDh`.
2. Run all unit tests.
3. Run type checking/linting and a production build.
4. Apply the Prisma migration with `prisma migrate deploy`.
5. Review the diff, commit only scoped files, and push `master`.
