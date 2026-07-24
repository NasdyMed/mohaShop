# Nike-style storefront redesign

## Context and goals

Redesign the collection cards and product detail page to reproduce the visual
structure of the supplied Nike references while preserving Maison Botte's
commerce rules, data model, Moroccan currency, cart, and delivery workflow.

Success means:

- collection cards use a large neutral image area followed by color choices,
  product information, and price;
- selecting a color changes the collection image immediately;
- the product page uses a thumbnail rail, a large main image, image-based color
  choices, and a three-column size grid;
- unavailable colors and sizes remain visible but cannot be selected;
- the first available color and size are selected automatically;
- the experience remains accessible and responsive.

## Design foundations

- Use a clean commerce layout with white page surfaces and `#f5f5f5` image
  stages.
- Keep Maison Botte's existing semantic tokens for text, actions, success, and
  danger states.
- Use the current typography stack, but reduce decorative editorial styling in
  the product-shopping surfaces.
- Use 4, 8, 12, 16, 24, and 32 pixel spacing increments.
- Interactive controls must have visible `:focus-visible` states and a minimum
  44-pixel touch target.

## Collection cards

Each card contains:

1. a nearly square product image stage;
2. an optional stock badge, visually secondary to the product;
3. compact circular color swatches immediately below the image;
4. the product name;
5. the category line `Botte`;
6. the price in DH.

Cards have no border, elevated shadow, quick size picker, quick add button, or
secondary “Voir le modèle” row. The entire image and product name link to the
product page.

Selecting an available swatch changes the card image without navigation. A
color-specific image is preferred, followed by a general image and then the
product fallback. Sold-out colors are visible with reduced opacity and a
diagonal strike, and their controls are disabled.

## Product detail page

Desktop uses two main zones:

- left: an 80-pixel vertical thumbnail rail and a large neutral main image;
- right: product name, category, price, image-based color choices, size
  selection, stock feedback, quantity, add-to-cart, and service notes.

The gallery displays images for the selected color plus general product images.
When multiple images are available, clicking a thumbnail changes the main
image. The active thumbnail has a high-contrast border. If only one image is
available, the main stage occupies the complete gallery width.

Color choices are rectangular image tiles. Each tile uses the first image
assigned to that color and exposes the color name through its accessible label.
If no color image exists, the tile falls back to a circular color swatch.
Unavailable colors remain visible, disabled, muted, and struck through.

Sizes use a three-column grid. Labels display `EU {size}`. Unavailable
combinations remain visible, muted, struck through, and disabled. The selected
size uses a strong dark border and background contrast.

The first in-stock variant determines the initial color and size. Changing a
color selects the first in-stock size for that color and updates the gallery.

## Responsive behavior

- At tablet widths, the detail page may use narrower left and right columns.
- Below 760 pixels, content stacks vertically.
- The thumbnail rail becomes a horizontally scrollable row below the main
  image.
- Size options remain a three-column grid while space allows and fall back to
  two columns on narrow phones.
- Collection cards remain four per row on wide screens, two on tablets, and one
  on mobile.

## Accessibility

- Color controls use radio inputs with color names in their accessible labels.
- Image color tiles include descriptive alternative text through the control
  label, while decorative tile images use empty alt text.
- Thumbnail buttons expose `aria-pressed`.
- Disabled variants use native `disabled` controls in addition to visual
  treatment.
- Keyboard users can operate every color, size, and thumbnail control.
- Text and control states must meet WCAG 2.2 AA contrast.

## Data flow

The catalog query continues returning all product images and variants.
`ProductCard` owns the selected card color and resolves the appropriate image.
`ProductDetailExperience` owns the selected variant color and passes it to both
the gallery and purchasing controls. The variant picker receives product images
so it can render image-based color tiles.

No database or admin schema change is required.

## Testing

- Unit tests cover card image changes, sold-out colors, image color tiles,
  default selection, size availability, thumbnail switching, and one-image
  gallery layout.
- Existing catalog, cart, and product detail tests remain green.
- Lint and the production build must pass.
- Browser QA verifies desktop collection layout, product-detail layout,
  swatch/image interactions, disabled states, and mobile stacking.

## Out of scope

- Nike branding, badges, ratings, personalization, carousel arrows, and size
  guide content;
- changes to admin image management;
- database migrations;
- changes to checkout or order management.

