# Product Card Promotion Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the collision between promotion and availability while improving the product-card hierarchy.

**Architecture:** Keep promotion inside the image as the only overlay and move availability into the card content. Reuse the existing localized stock labels and semantic color states, with logical CSS positioning for RTL support.

**Tech Stack:** React 19, Next.js 16, CSS, Vitest, Testing Library.

---

### Task 1: Lock the card anatomy

**Files:**
- Modify: `tests/unit/catalog-layout.test.tsx`
- Modify: `components/shop/product-card.tsx`

- [ ] Add assertions that `.product-card-media` contains the promotion badge but not `.product-card-stock`, and that the stock element appears inside `.product-card-copy`.
- [ ] Run `pnpm test tests/unit/catalog-layout.test.tsx` and confirm the test fails because stock is still inside the media.
- [ ] Move the existing localized stock element immediately inside `.product-card-copy`.
- [ ] Change promotion content from `PROMO −19 %` to `−19 %`.
- [ ] Run the focused test and confirm it passes.

### Task 2: Apply the Impeccable visual rules

**Files:**
- Modify: `app/globals.css`
- Test: `tests/unit/catalog-layout.test.tsx`

- [ ] Add CSS-source assertions for logical badge positioning and an inline stock status.
- [ ] Run the focused test and confirm it fails.
- [ ] Position the promotion badge with `inset-inline-start: 12px`, compact padding, and the secondary token.
- [ ] Convert stock from absolute overlay to an inline-flex text row with semantic dot and consistent spacing.
- [ ] Add 320 px and RTL acceptance assertions.
- [ ] Run the focused test and confirm it passes.

### Task 3: Verify and publish

**Files:**
- Modify only files listed above plus this plan.

- [ ] Run `pnpm test tests/unit`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm build`.
- [ ] Run `git diff --check`.
- [ ] Commit scoped files and push `master`, preserving unrelated local files.
