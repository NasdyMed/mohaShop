# Product Card Promotion Badges Design

## Context and goals

Separate promotion and availability into two distinct visual zones so both remain readable on narrow product cards without covering the product.

## Design tokens and foundations

- Promotion uses the existing secondary burnt-orange token with white text.
- Availability keeps the existing success or unavailable semantic color.
- Spacing follows the 4/8/12/16 scale.
- Text remains uppercase, concise, and WCAG 2.2 AA compliant.

## Component-level rules

- The image contains one compact promotion badge only: `−43 %`.
- The badge sits at the top-left in LTR and top-right in RTL, 12 px from each edge.
- Availability moves below the image, before the color choices and product name.
- Availability is rendered as inline text with a semantic status dot, not as an overlay.
- Without promotion, the image has no empty badge space.
- Without stock, the status reads the existing localized sold-out label.
- The layout must remain collision-free on one-, two-, and four-column grids.

## Accessibility requirements

- Availability remains textual; color is never its only signal.
- Promotion text exposes the discount percentage directly.
- Both labels must remain readable at 200% zoom and on a 320 px viewport.

## Content standards

- Promotion: percentage only, for example `−43 %`.
- Availability: existing localized labels such as `En stock` and `Épuisé`.
- Do not repeat “PROMO” when the crossed-out price already establishes the promotional context.

## Anti-patterns

- Do not position two variable-width badges on the same image row.
- Do not cover the product with stacked promotional labels.
- Do not use arbitrary raw colors when semantic tokens already exist.

## QA checklist

- Promotion badge and availability never overlap.
- The badge mirrors correctly in Arabic.
- Available and sold-out states remain explicit.
- Cards without promotions retain the same image proportions.
- Unit tests, lint, and production build pass.
