# Minimal Checkout and WhatsApp Design

## Context and goals

Reduce checkout friction for Moroccan customers by collecting only the four delivery fields requested, while adding a permanent direct WhatsApp contact entry point.

## Checkout data model

- The customer form contains exactly: first name, last name, city, and address.
- All four fields remain required and validated in French and Arabic.
- Country is assigned server-side as `Maroc`.
- New orders store no fabricated phone, e-mail, region, postal code, address complement, or delivery notes.
- Existing orders keep all historical delivery data.
- `customerPhone` and `customerRegion` become nullable in Prisma; already optional delivery columns remain unchanged.
- Admin order pages render `—` for a missing phone or region and never create empty `tel:` links.

## WhatsApp component

- A global storefront link opens `https://wa.me/212645194705`.
- The public number is centralized as a non-secret application constant.
- The link opens in a new browsing context with `rel="noopener noreferrer"`.
- It uses an accessible SVG WhatsApp mark, a localized French/Arabic label, and a 56–62 px touch target.
- It is fixed above the existing cart button, with at least 12 px between both controls.
- Desktop hover/focus states reveal clear feedback; touch devices keep both controls permanently visible.
- The WhatsApp button uses the semantic WhatsApp green while retaining the existing white border and shadow language.

## Validation and order creation

- The strict checkout schema accepts only first name, last name, city, address, locale, and cart items.
- Removed client fields are rejected instead of silently stored.
- The order service maps the four fields, assigns `Maroc`, and writes null to optional legacy delivery columns.
- Cart pricing, stock checks, rate limiting, order confirmation, and status management remain unchanged.

## Accessibility

- Both floating controls have distinct localized accessible names.
- Focus indicators meet WCAG 2.2 AA and are not clipped.
- The two controls never overlap at 320 px width or with safe-area insets.
- WhatsApp color is not the only identifier; the accessible label and recognizable icon are both present.

## Anti-patterns

- Do not generate fake phone or region values.
- Do not use an emoji as the WhatsApp icon.
- Do not place WhatsApp and cart controls at the same fixed coordinates.
- Do not expose the formatted display number in the `wa.me` URL.

## QA checklist

- Checkout renders exactly four customer inputs in French and Arabic.
- A valid four-field order is persisted successfully.
- Historical orders remain readable.
- Admin order list and detail tolerate missing phone and region.
- WhatsApp opens `212645194705`.
- WhatsApp and cart controls remain separate on desktop and mobile.
- Unit tests, lint, production build, and Prisma migration pass.
