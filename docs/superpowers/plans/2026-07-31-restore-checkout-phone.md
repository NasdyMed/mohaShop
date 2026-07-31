# Restore Checkout Phone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a required Moroccan mobile phone field throughout checkout and order persistence.

**Architecture:** Extend the existing shared checkout schema so client and server enforce the same rule and normalization. Wire the field through the existing controlled form and persist the parsed value in the existing Order column.

**Tech Stack:** Next.js, React, TypeScript, Zod, Prisma, Vitest, Testing Library

---

### Task 1: Specify the restored phone behavior

**Files:**
- Modify: `tests/unit/checkout-form.test.tsx`
- Modify: `tests/unit/checkout-validation.test.ts`
- Modify: `tests/unit/minimal-checkout-order.test.ts`

- [x] Add assertions for a required `Téléphone`/Arabic tel input, submitted phone data, normalized Moroccan numbers, and persisted `customerPhone`.
- [x] Run the focused tests and verify they fail because phone is absent from the current schema/form/order write.

### Task 2: Restore phone end to end

**Files:**
- Modify: `components/cart/checkout-form.tsx`
- Modify: `lib/validation/checkout.ts`
- Modify: `lib/orders/create-order.ts`

- [x] Add `phone` to controlled fields and localized labels, render it as `type="tel"` with `autocomplete="tel"`, and map client/server field errors.
- [x] Add the required Moroccan mobile schema using `validMoroccanPhone` and `normalizeMoroccanPhone`.
- [x] Store `checkout.phone` in `customerPhone`.
- [x] Run focused tests until green, then run the unit suite, lint, and production build.
