# Direct Product Checkout Design

## Goal

Reduce friction observed during user testing by replacing the product-page “Add to cart” action with a direct “Order now” action that opens the checkout form.

## User flow

1. The product page preselects the first available color and size, as it does today.
2. The customer may change the color, size, and quantity.
3. The customer selects “Commander maintenant” in French or the Arabic equivalent.
4. The selected variant and quantity are added to the existing cart without removing other cart items.
5. The action becomes disabled and displays a redirecting state to prevent duplicate additions.
6. The customer is redirected to the localized checkout route: `/commander` or `/ar/commander`.

## Scope

- Keep the quantity selector on the product page.
- Keep the floating cart control and the cart page unchanged.
- Preserve all products already present in the cart.
- Reuse the existing cart reducer and localized routing helpers.
- Keep unavailable products and variants non-purchasable.
- Do not embed or duplicate the checkout form on the product page.

## Components and data flow

The existing product purchase component remains responsible for variant selection. The current add-to-cart control becomes a direct checkout control. On activation, it dispatches the existing cart `add` action with the selected product snapshot, variant, and quantity, then navigates through the Next.js router to the localized checkout route.

The global `CartProvider` remains mounted across storefront navigation, so the checkout page receives the updated cart including any earlier items.

## Interaction and error handling

- The action is enabled only when a stocked variant is selected and the quantity is valid.
- The first activation locks the control immediately, preventing double submission.
- While navigation is pending, the button displays a localized redirecting label.
- If client-side navigation throws, the control unlocks and remains usable; the cart addition is not repeated automatically.
- Existing stock limits continue to cap the quantity selector.

## Internationalization

The storefront dictionaries gain localized labels for the direct order action and redirecting state. The accessible product information label uses the new direct-order wording rather than the old add-to-cart wording.

## Testing

Automated tests will verify:

- the new French and Arabic labels;
- preservation of the quantity selector;
- dispatching the selected variant and requested quantity;
- preservation of existing cart items through the reducer behavior;
- navigation to the French and Arabic checkout routes;
- immediate duplicate-click protection;
- disabled behavior when no stocked variant is selected.

