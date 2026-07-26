# French/Arabic Storefront i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a French-default storefront and a complete Arabic RTL storefront under `/ar`, with optional Arabic product content managed from the French admin.

**Architecture:** Keep the current French routes unchanged and add parallel Arabic App Router routes. A small typed i18n module owns locales, dictionaries, localized paths and product fallbacks. Prisma stores optional Arabic product fields; all other canonical business data remains language-neutral.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7/PostgreSQL, Zod, Vitest and Testing Library.

---

## File structure

- `lib/i18n/config.ts`: locale types, validation and path helpers.
- `lib/i18n/dictionaries.ts`: structurally typed FR/AR storefront messages.
- `lib/i18n/product.ts`: localized product name/description fallback.
- `components/shop/language-switcher.tsx`: accessible France/Morocco selector and cookie persistence.
- `components/shop/storefront-shell.tsx`: locale-aware header/footer shared by public pages.
- `app/(shop)/*`: existing French pages, explicitly supplied with `fr`.
- `app/ar/*`: Arabic routes and RTL layout.
- `prisma/schema.prisma` and a new migration: optional Arabic product columns.
- Admin validation, mutation and form files: capture and persist translations.
- Focused unit/integration tests: red-green coverage for each boundary.

### Task 1: Typed locale core and dictionaries

**Files:**
- Create: `lib/i18n/config.ts`
- Create: `lib/i18n/dictionaries.ts`
- Create: `tests/unit/i18n.test.ts`

- [ ] Write failing tests asserting supported locales, `/ar` path conversion, Arabic color/status translations and dictionary key parity.
- [ ] Run `pnpm vitest run tests/unit/i18n.test.ts` and verify failure because the modules do not exist.
- [ ] Implement `Locale = "fr" | "ar"`, `isLocale`, `localizePath`, `alternateLocalePath`, and `getDictionary`.
- [ ] Keep `fr` unprefixed and prefix only public Arabic paths with `/ar`; leave `/admin` and `/api` untouched.
- [ ] Run the focused test and verify it passes.
- [ ] Commit with `feat: add typed storefront translations`.

### Task 2: Arabic product fields and fallback

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260726120000_add_product_arabic_fields/migration.sql`
- Modify: `lib/validation/product.ts`
- Modify: `lib/catalog/admin-mutations.ts`
- Modify: `components/admin/product-form.tsx`
- Modify: `app/admin/(protected)/produits/[id]/page.tsx`
- Create: `lib/i18n/product.ts`
- Modify: `tests/unit/product-validation.test.ts`
- Modify: `tests/unit/product-form.test.tsx`
- Modify: `tests/integration/save-product.test.ts`
- Create: `tests/unit/localized-product.test.ts`

- [ ] Add failing tests for optional trimmed `nameAr`/`descriptionAr`, persistence, admin form fields and French fallback.
- [ ] Run the focused tests and verify the new fields/API are absent.
- [ ] Add nullable `nameAr String?` and `descriptionAr String?` columns and the additive SQL migration.
- [ ] Extend the Zod input with optional values normalized from empty string to `null`.
- [ ] Persist both values on create/update and expose them through the admin edit page.
- [ ] Add Arabic inputs with `dir="rtl"` and a French-fallback help message.
- [ ] Implement `localizeProduct(product, locale)` returning localized `name` and `description`.
- [ ] Generate Prisma Client, rerun focused tests and commit with `feat: manage Arabic product translations`.

### Task 3: Locale-aware shell and direction

**Files:**
- Create: `components/shop/language-switcher.tsx`
- Create: `components/shop/storefront-shell.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/(shop)/layout.tsx`
- Create: `app/ar/layout.tsx`
- Modify: `app/globals.css`
- Create: `tests/unit/language-switcher.test.tsx`
- Create: `tests/unit/storefront-shell.test.tsx`

- [ ] Add failing tests for accessible flag controls, equivalent route selection, locale cookie and Arabic `dir="rtl"`.
- [ ] Verify red with the focused Vitest command.
- [ ] Build the flag selector using emoji flags plus visible/accessible language labels.
- [ ] Build the shared shell and set `lang`/`dir` on a locale-scoped wrapper because the root document remains French for unprefixed routes.
- [ ] Add logical CSS properties and `[dir="rtl"]` overrides for navigation and layout, without mirroring product imagery or numeric controls.
- [ ] Verify green and commit with `feat: add RTL storefront shell`.

### Task 4: Localize catalogue and product pages

**Files:**
- Modify: `lib/catalog/queries.ts`
- Modify: `components/shop/product-card.tsx`
- Modify: `components/shop/product-detail-experience.tsx`
- Modify: `components/shop/product-gallery.tsx`
- Modify: `components/shop/quick-variant-selector.tsx`
- Modify: `components/shop/variant-picker.tsx`
- Modify: `app/(shop)/page.tsx`
- Modify: `app/(shop)/produits/[slug]/page.tsx`
- Create: `app/ar/page.tsx`
- Create: `app/ar/produits/[slug]/page.tsx`
- Modify: relevant catalogue/detail unit tests.

- [ ] Add failing tests for localized content, translated controls/colors/stock and Arabic product links.
- [ ] Verify red.
- [ ] Make storefront components accept `locale` and dictionary slices rather than importing literal French copy.
- [ ] Reuse catalogue queries, apply `localizeProduct`, and add thin Arabic page entry points.
- [ ] Add locale-specific metadata, canonical URLs and FR/AR alternates.
- [ ] Verify focused tests and commit with `feat: localize catalogue and product pages`.

### Task 5: Localize cart state and cart page

**Files:**
- Modify: `components/cart/cart-types.ts`
- Modify: `components/cart/product-purchase.tsx`
- Modify: `components/cart/cart-feedback.tsx`
- Modify: `components/cart/cart-link.tsx`
- Modify: `components/cart/cart-view.tsx`
- Modify: `app/(shop)/panier/page.tsx`
- Create: `app/ar/panier/page.tsx`
- Modify: cart-related unit tests.

- [ ] Add failing tests proving Arabic product names enter cart, Arabic paths are preserved and cart controls are translated.
- [ ] Verify red.
- [ ] Carry locale-localized display names in cart items while keeping variant IDs and canonical values stable.
- [ ] Parameterize feedback/cart UI with locale and dictionary messages.
- [ ] Add the Arabic cart page and localized links.
- [ ] Verify focused tests and commit with `feat: localize storefront cart`.

### Task 6: Localize checkout and confirmation

**Files:**
- Modify: `components/cart/checkout-form.tsx`
- Modify: `app/(shop)/commander/page.tsx`
- Modify: `app/(shop)/commande/[number]/page.tsx`
- Create: `app/ar/commander/page.tsx`
- Create: `app/ar/commande/[number]/page.tsx`
- Modify: `app/actions/create-order.ts`
- Modify: checkout and confirmation unit tests.

- [ ] Add failing tests for Arabic labels, validation messages, localized redirect and translated confirmation/status.
- [ ] Verify red.
- [ ] Parameterize checkout rendering with locale/dictionary while keeping submitted customer data unchanged.
- [ ] Return stable error codes from order creation where needed and map them to locale copy in the form.
- [ ] Add Arabic checkout/confirmation pages and preserve `/ar` after successful order creation.
- [ ] Verify focused tests and commit with `feat: localize checkout flow`.

### Task 7: SEO, loading and error states

**Files:**
- Modify: `app/(shop)/loading.tsx`
- Create: `app/ar/loading.tsx`
- Modify: `app/not-found.tsx`
- Modify: `app/error.tsx`
- Modify: metadata exports/generators on public pages.
- Modify: `tests/unit/loading-ux.test.tsx`
- Modify: `tests/unit/global-error-pages.test.tsx`
- Create: `tests/unit/i18n-metadata.test.ts`

- [ ] Add failing tests for localized loading/error copy and canonical/hreflang metadata.
- [ ] Verify red.
- [ ] Implement localized states and metadata helpers.
- [ ] Ensure unknown locale-like paths return not found and do not affect admin/API.
- [ ] Verify focused tests and commit with `feat: complete localized storefront states`.

### Task 8: Migration, full verification and delivery

**Files:**
- Modify only files required by failures found during verification.

- [ ] Run `pnpm exec prisma format`, `pnpm exec prisma validate`, and `pnpm exec prisma generate`.
- [ ] Apply the migration to the configured development/Neon database only after confirming the target.
- [ ] Run `pnpm vitest run tests/unit`, `pnpm lint`, and `pnpm build`.
- [ ] Run integration tests only when an isolated `TEST_DATABASE_URL` whose database name contains `test` is configured; otherwise report the explicit precondition.
- [ ] Test `/`, `/ar`, one product route in each locale, both carts and both checkout pages at desktop and mobile widths.
- [ ] Confirm `git diff --check` and inspect the final diff against every design requirement.
- [ ] Commit remaining verification fixes with `chore: finalize French Arabic storefront`.
- [ ] Push `master` to `origin`.
