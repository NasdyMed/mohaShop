# Direct Product Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the product-page add-to-cart action with a localized “Order now” action that preserves the cart and opens checkout immediately.

**Architecture:** Keep variant and quantity selection in the existing product purchase flow. Convert the current cart action into a direct-checkout control that dispatches the existing cart `add` action exactly once for a request, then navigates with Next.js to the localized checkout route. No database, checkout, or cart reducer changes are required.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library, existing CartProvider and storefront i18n dictionaries.

---

### Task 1: Add localized direct-order labels

**Files:**
- Modify: `lib/i18n/dictionaries.ts`
- Test: `tests/unit/i18n.test.ts`

- [ ] **Step 1: Write the failing dictionary test**

Add assertions to the dictionary structure test:

```ts
expect(fr.product.orderNow).toBe("Commander maintenant");
expect(fr.product.redirecting).toBe("Redirection…");
expect(ar.product.orderNow).toBe("اطلب الآن");
expect(ar.product.redirecting).toBe("جارٍ الانتقال…");
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm test tests/unit/i18n.test.ts
```

Expected: FAIL because `orderNow` and `redirecting` do not exist on the product dictionary.

- [ ] **Step 3: Extend the dictionary type and both locales**

Add the two fields to `StorefrontDictionary["product"]` and to both dictionaries:

```ts
product: {
  addToCart: string;
  orderNow: string;
  redirecting: string;
  selectVariant: string;
  // existing fields remain unchanged
};
```

French values:

```ts
orderNow: "Commander maintenant",
redirecting: "Redirection…",
```

Arabic values:

```ts
orderNow: "اطلب الآن",
redirecting: "جارٍ الانتقال…",
```

Keep `addToCart` because global cart feedback may still use cart-oriented wording and removing an existing dictionary key is outside this feature.

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```bash
pnpm test tests/unit/i18n.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the dictionary change**

```bash
git add lib/i18n/dictionaries.ts tests/unit/i18n.test.ts
git commit -m "feat: add direct checkout translations"
```

### Task 2: Redirect from the product action while preserving the cart

**Files:**
- Modify: `components/cart/add-to-cart.tsx`
- Test: `tests/unit/product-purchase.test.tsx`

- [ ] **Step 1: Mock navigation and write failing French-flow tests**

At the top of `tests/unit/product-purchase.test.tsx`, add a hoisted router mock:

```ts
const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
}));
```

Reset it in `beforeEach`:

```ts
navigation.push.mockReset();
```

Replace the old “stores the image” interaction with a test that selects the black variant, chooses quantity 2, clicks the direct action, and asserts both the cart snapshot and navigation:

```ts
fireEvent.click(screen.getByRole("radio", { name: "Noir" }));
fireEvent.change(screen.getByLabelText("Quantité"), { target: { value: "2" } });
fireEvent.click(screen.getByRole("button", { name: "Commander maintenant" }));

await waitFor(() => {
  expect(screen.getByTestId("cart-items")).toHaveTextContent('"imageUrl":"/noir.jpg"');
  expect(screen.getByTestId("cart-items")).toHaveTextContent('"quantity":2');
});
expect(navigation.push).toHaveBeenCalledWith("/commander");
```

Add a second test that hydrates an existing variant from `localStorage`, waits for it to appear, orders another variant, and expects both variant IDs in `CartProbe`. This proves that the action appends instead of clearing.

- [ ] **Step 2: Write failing duplicate-click and navigation-error tests**

Add a test that clicks twice and verifies only one cart quantity is added and only one navigation occurs:

```ts
const action = screen.getByRole("button", { name: "Commander maintenant" });
fireEvent.click(action);
fireEvent.click(action);

expect(navigation.push).toHaveBeenCalledTimes(1);
await waitFor(() => expect(screen.getByTestId("cart-items")).toHaveTextContent('"quantity":1'));
```

Add a test with `navigation.push.mockImplementation(() => { throw new Error("navigation failed"); })`. After the first click, restore the mock and click again. Assert that navigation is retried but the same variant quantity remains 1, proving retry does not duplicate the cart addition.

Add the Arabic navigation test before implementation. Wrap `ProductPurchase` in `LocaleProvider locale="ar"`, click the Arabic direct-order label, and expect `navigation.push` to receive `/ar/commander`:

```tsx
render(
  <LocaleProvider locale="ar">
    <CartProvider>
      <ProductPurchase product={product} variants={variants} />
    </CartProvider>
  </LocaleProvider>,
);

fireEvent.click(screen.getByRole("button", { name: "اطلب الآن" }));
expect(navigation.push).toHaveBeenCalledWith("/ar/commander");
```

- [ ] **Step 3: Run the purchase tests and verify RED**

Run:

```bash
pnpm test tests/unit/product-purchase.test.tsx
```

Expected: FAIL because the button still says “Ajouter au panier”, no redirect occurs, and the action is not locked.

- [ ] **Step 4: Implement the minimal direct-checkout action**

In `components/cart/add-to-cart.tsx`:

- remove the confirmation state and cart-page `Link`;
- import `useRouter` from `next/navigation`, plus `useRef`;
- retain the quantity input and stock clamping;
- add a synchronous lock and a request key to prevent duplicate cart additions;
- dispatch before navigation;
- navigate through `localizePath("/commander", locale)`.

The action logic should follow this shape:

```ts
const router = useRouter();
const submitLocked = useRef(false);
const addedRequest = useRef<string | null>(null);
const [pending, setPending] = useState(false);

function orderNow() {
  if (!variant || variant.stock < 1 || submitLocked.current) return;

  submitLocked.current = true;
  setPending(true);
  const requestKey = `${variant.id}:${safeQuantity}`;

  if (addedRequest.current !== requestKey) {
    dispatch({
      type: "add",
      item: {
        variantId: variant.id,
        productSlug: product.slug,
        productName: product.name,
        imageUrl: product.imageUrl,
        size: variant.size,
        color: variant.color,
        unitPriceDh: product.unitPriceDh,
        availableStock: variant.stock,
      },
      quantity: safeQuantity,
    });
    addedRequest.current = requestKey;
  }

  try {
    router.push(localizePath("/commander", locale));
  } catch {
    submitLocked.current = false;
    setPending(false);
  }
}
```

Render the button as:

```tsx
<button type="button" disabled={!available || pending} onClick={orderNow}>
  {!available
    ? dictionary.product.selectVariant
    : pending
      ? dictionary.product.redirecting
      : dictionary.product.orderNow}
</button>
```

Keep the component key based on the selected variant in `product-purchase.tsx`; this resets quantity and direct-action state whenever the customer changes variants.

- [ ] **Step 5: Run the purchase tests and verify GREEN**

Run:

```bash
pnpm test tests/unit/product-purchase.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the direct-checkout behavior**

```bash
git add components/cart/add-to-cart.tsx tests/unit/product-purchase.test.tsx
git commit -m "feat: order directly from product page"
```

### Task 3: Update product accessibility and touch-target coverage

**Files:**
- Modify: `components/shop/product-detail-experience.tsx`
- Modify: `tests/unit/product-detail-experience.test.tsx`
- Modify: `tests/unit/product-purchase.test.tsx`
- Modify: `tests/unit/touch-targets.test.ts`

- [ ] **Step 1: Write failing accessibility and touch-target tests**

In `product-detail-experience.test.tsx`, assert that the product information region uses the new wording:

```ts
expect(screen.getByLabelText("Commander maintenant Bottine Atlas")).toBeInTheDocument();
```

Update `touch-targets.test.ts` so it no longer expects the removed cart confirmation `touch-link`. Instead, assert that `app/globals.css` still gives `.add-to-cart button` a minimum height of 52px.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
pnpm test tests/unit/product-purchase.test.tsx tests/unit/product-detail-experience.test.tsx tests/unit/touch-targets.test.ts
```

Expected: the accessibility assertion fails because the product region still uses `addToCart`, and the source assertion fails because it still expects the removed confirmation link.

- [ ] **Step 3: Update the product information label**

In `components/shop/product-detail-experience.tsx`, replace:

```tsx
aria-label={`${dictionary.product.addToCart} ${localizedProduct.name}`}
```

with:

```tsx
aria-label={`${dictionary.product.orderNow} ${localizedProduct.name}`}
```

Do not modify the variant, gallery, sold-out, price, or service-note behavior.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
pnpm test tests/unit/product-purchase.test.tsx tests/unit/product-detail-experience.test.tsx tests/unit/touch-targets.test.ts tests/unit/i18n.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit accessibility and Arabic coverage**

```bash
git add components/shop/product-detail-experience.tsx tests/unit/product-detail-experience.test.tsx tests/unit/product-purchase.test.tsx tests/unit/touch-targets.test.ts
git commit -m "test: cover localized direct product checkout"
```

### Task 4: Verify and publish

**Files:**
- No additional production files.

- [ ] **Step 1: Run the complete unit test suite**

```bash
pnpm test tests/unit
```

Expected: all unit tests pass with zero failures.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Run the production build**

```bash
pnpm build
```

Expected: Next.js compiles, TypeScript succeeds, and all routes build successfully.

- [ ] **Step 4: Review the final diff and preserve unrelated files**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors. Do not stage `.gitignore.bak`, clipboard images, or any unrelated user files.

- [ ] **Step 5: Push the verified commits**

```bash
git push origin master
```

Expected: the remote `master` points to the verified implementation commit.
