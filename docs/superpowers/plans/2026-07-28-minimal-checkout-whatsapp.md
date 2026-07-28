# Minimal Checkout and WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limit checkout to first name, last name, city, and address, and add a global floating WhatsApp contact link.

**Architecture:** Narrow the strict checkout contract and persist absent legacy delivery fields as null while preserving historical records. Add a focused WhatsApp link component beside the existing global cart feedback controls.

**Tech Stack:** Next.js 16, React 19, Prisma/PostgreSQL, Zod, CSS, Vitest, Testing Library.

---

### Task 1: Narrow checkout validation

**Files:**
- Modify: `tests/unit/checkout-validation.test.ts`
- Modify: `lib/validation/checkout.ts`

- [ ] Add a failing test proving the four requested fields plus items are accepted.
- [ ] Add a failing test proving removed delivery fields are rejected by the strict schema.
- [ ] Remove phone, email, complement, region, postal code, country, and notes from the public schema.
- [ ] Run `pnpm test tests/unit/checkout-validation.test.ts`.

### Task 2: Simplify the checkout form

**Files:**
- Modify: `tests/unit/checkout-form.test.tsx`
- Modify: `components/cart/checkout-form.tsx`

- [ ] Add failing assertions that only four customer inputs are rendered in French and Arabic.
- [ ] Reduce form state, field errors, labels, and rendered controls to the four fields.
- [ ] Keep cart summary, loading, validation feedback, and confirmation behavior unchanged.
- [ ] Run `pnpm test tests/unit/checkout-form.test.tsx`.

### Task 3: Persist minimal orders safely

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260728_minimal_checkout/migration.sql`
- Modify: `lib/orders/create-order.ts`
- Modify: `tests/unit/create-order-action.test.ts`
- Modify: relevant order persistence tests.

- [ ] Add failing persistence assertions for null phone/region and server-assigned `Maroc`.
- [ ] Make `customerPhone` and `customerRegion` nullable.
- [ ] Map only the four requested fields and assign the country server-side.
- [ ] Generate Prisma Client and run focused order tests.

### Task 4: Make admin order views nullable-safe

**Files:**
- Modify: `app/admin/(protected)/commandes/page.tsx`
- Modify: `app/admin/(protected)/commandes/[id]/page.tsx`
- Modify: relevant admin order tests.

- [ ] Add failing tests for an order without phone or region.
- [ ] Render `—` instead of empty links or separators.
- [ ] Run focused admin tests.

### Task 5: Add the global WhatsApp control

**Files:**
- Create: `lib/store/contact.ts`
- Create: `components/cart/whatsapp-link.tsx`
- Modify: `components/cart/cart-feedback.tsx`
- Modify: `app/globals.css`
- Modify: `tests/unit/cart-provider.test.tsx`

- [ ] Add a failing test for `https://wa.me/212645194705`, the accessible label, and a separate floating control.
- [ ] Implement the centralized number and SVG WhatsApp link.
- [ ] Position it above the cart with safe-area-aware spacing and explicit focus/hover states.
- [ ] Run the focused cart test.

### Task 6: Verify, migrate, and publish

**Files:**
- Modify only scoped files plus this plan.

- [ ] Run all unit tests.
- [ ] Run lint and production build.
- [ ] Apply `prisma migrate deploy` and confirm schema status.
- [ ] Commit scoped files and push `master` without staging unrelated local files.
