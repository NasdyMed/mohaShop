# Boutique de bottes MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer une boutique Next.js en français permettant de commander plusieurs variantes de bottes en paiement à la livraison, avec gestion administrative du catalogue, des stocks et des commandes.

**Architecture:** Une application Next.js App Router regroupe les pages publiques, les Server Actions et le panneau d'administration. Prisma encapsule PostgreSQL et exécute les transactions de commande ; les règles métier restent dans des modules indépendants testables. Le panier reste côté navigateur, tandis que les prix, stocks, sessions et changements d'état sont systématiquement validés côté serveur.

**Tech Stack:** Next.js, React, TypeScript strict, Tailwind CSS, Prisma/PostgreSQL (Neon), Auth.js Credentials, Zod, Vercel Blob, Vitest, Testing Library, Playwright, pnpm.

---

## Structure cible

```text
app/
  (shop)/page.tsx                     # catalogue public
  (shop)/produits/[slug]/page.tsx     # fiche produit
  (shop)/panier/page.tsx              # panier
  (shop)/commander/page.tsx           # formulaire invité
  (shop)/commande/[number]/page.tsx   # confirmation
  admin/(protected)/commandes/         # gestion des commandes
  admin/(protected)/produits/          # gestion du catalogue
  admin/connexion/page.tsx             # connexion
  api/auth/[...nextauth]/route.ts       # endpoints Auth.js
  actions/                              # Server Actions fines
components/cart/                        # état et composants du panier
components/shop/                        # cartes et sélection de variantes
components/admin/                       # formulaires et tableaux admin
lib/auth/                               # configuration et garde admin
lib/catalog/                            # lectures et mutations catalogue
lib/orders/                             # validation, création, transitions
lib/validation/                         # schémas Zod partagés
lib/db.ts                               # singleton Prisma
prisma/schema.prisma                    # modèle relationnel
prisma/seed.ts                          # administrateur et démonstration
tests/unit/                             # règles métier isolées
tests/integration/                      # PostgreSQL de test
tests/e2e/                              # parcours navigateur
```

Chaque module métier exporte une petite interface documentée ; les composants ne requêtent jamais Prisma directement.

### Task 1: Initialiser l'application et l'outillage de test

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `.env.example`
- Test: `tests/unit/smoke.test.ts`

- [ ] **Step 1: Scaffolder Next.js dans le dossier courant**

Run:

```bash
pnpm dlx create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm
```

Expected: l'application est créée sans écraser `docs/` ni `.git/`, et `pnpm dev` est disponible.

- [ ] **Step 2: Installer les dépendances du MVP**

Run:

```bash
pnpm add next-auth @prisma/client zod bcryptjs @vercel/blob @upstash/redis @upstash/ratelimit
pnpm add -D prisma tsx vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test
```

Expected: `pnpm install` termine sans vulnérabilité bloquante ni conflit de peer dependencies.

- [ ] **Step 3: Ajouter les scripts de qualité à `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" }
}
```

- [ ] **Step 4: Écrire puis exécuter le smoke test**

```ts
// tests/unit/smoke.test.ts
import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs TypeScript tests", () => expect(true).toBe(true));
});
```

Run: `pnpm test`

Expected: `1 passed`.

- [ ] **Step 5: Définir les variables documentées**

```dotenv
# .env.example
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
AUTH_SECRET=generate-with-openssl-rand-base64-32
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-before-seeding
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_token
UPSTASH_REDIS_REST_URL=https://example.upstash.io
UPSTASH_REDIS_REST_TOKEN=upstash_rest_token
```

- [ ] **Step 6: Vérifier et committer**

Run: `pnpm lint && pnpm test && pnpm build`

Expected: les trois commandes réussissent.

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts vitest.config.ts playwright.config.ts app tests .env.example
git commit -m "chore: scaffold Next.js storefront"
```

### Task 2: Modéliser PostgreSQL et préparer les données

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `lib/db.ts`
- Test: `tests/unit/order-status.test.ts`
- Create: `lib/orders/status.ts`

- [ ] **Step 1: Écrire le test des transitions de commande**

```ts
// tests/unit/order-status.test.ts
import { canTransition } from "@/lib/orders/status";
import { describe, expect, it } from "vitest";

describe("canTransition", () => {
  it.each([
    ["NEW", "CONFIRMED"], ["CONFIRMED", "SHIPPED"],
    ["SHIPPED", "DELIVERED"], ["NEW", "CANCELLED"],
    ["CONFIRMED", "CANCELLED"], ["SHIPPED", "CANCELLED"],
  ] as const)("accepts %s -> %s", (from, to) => expect(canTransition(from, to)).toBe(true));

  it.each([["DELIVERED", "CANCELLED"], ["CANCELLED", "NEW"], ["NEW", "DELIVERED"]] as const)(
    "rejects %s -> %s", (from, to) => expect(canTransition(from, to)).toBe(false),
  );
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `pnpm test tests/unit/order-status.test.ts`

Expected: FAIL car `@/lib/orders/status` n'existe pas.

- [ ] **Step 3: Créer le schéma Prisma**

Définir les enums `OrderStatus { NEW CONFIRMED SHIPPED DELIVERED CANCELLED }` et les modèles suivants :

```prisma
model Product {
  id          String           @id @default(cuid())
  slug        String           @unique
  name        String
  description String
  priceDh     Int
  isVisible   Boolean          @default(false)
  images      ProductImage[]
  variants    ProductVariant[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

model ProductImage {
  id        String  @id @default(cuid())
  url       String
  alt       String
  position  Int     @default(0)
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProductVariant {
  id        String      @id @default(cuid())
  sku       String      @unique
  size      String
  color     String
  stock     Int         @default(0)
  productId String
  product   Product     @relation(fields: [productId], references: [id])
  orderItems OrderItem[]
  @@unique([productId, size, color])
}

model Order {
  id             String       @id @default(cuid())
  number         String       @unique
  customerFirstName String
  customerLastName  String
  customerPhone     String
  customerAddress   String
  totalDh        Int
  status         OrderStatus  @default(NEW)
  stockRestored  Boolean      @default(false)
  items          OrderItem[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model OrderItem {
  id          String         @id @default(cuid())
  orderId     String
  variantId   String
  productName String
  size        String
  color       String
  unitPriceDh Int
  quantity    Int
  order       Order          @relation(fields: [orderId], references: [id])
  variant     ProductVariant @relation(fields: [variantId], references: [id])
}

model Admin {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}
```

Auth.js utilise des sessions JWT dans ce MVP : aucun modèle `Account`, `Session` ou `VerificationToken` n'est nécessaire. Le modèle `Admin` reste l'unique source d'identifiants.

- [ ] **Step 4: Implémenter les transitions et le client Prisma**

```ts
// lib/orders/status.ts
import type { OrderStatus } from "@prisma/client";

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"], DELIVERED: [], CANCELLED: [],
};
export const canTransition = (from: OrderStatus, to: OrderStatus) => transitions[from].includes(to);
```

```ts
// lib/db.ts
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 5: Migrer, générer et tester**

Run: `pnpm prisma format && pnpm prisma generate && pnpm db:migrate -- --name initial && pnpm test tests/unit/order-status.test.ts`

Expected: migration créée et tests PASS.

- [ ] **Step 6: Créer un seed idempotent**

Dans `prisma/seed.ts`, valider `ADMIN_EMAIL` et `ADMIN_PASSWORD`, refuser un mot de passe inférieur à 12 caractères, hacher avec `bcrypt.hash(password, 12)`, faire `admin.upsert`, puis créer par `product.upsert` deux produits de démonstration avec images et variantes. Ne jamais journaliser le mot de passe.

- [ ] **Step 7: Commit**

```bash
git add prisma lib/db.ts lib/orders/status.ts tests/unit/order-status.test.ts
git commit -m "feat: model catalog orders and inventory"
```

### Task 3: Construire les lectures du catalogue public

**Files:**
- Create: `lib/catalog/queries.ts`
- Create: `components/shop/product-card.tsx`
- Create: `components/shop/product-gallery.tsx`
- Create: `components/shop/variant-picker.tsx`
- Create: `app/(shop)/page.tsx`
- Create: `app/(shop)/produits/[slug]/page.tsx`
- Test: `tests/unit/variant-picker.test.tsx`

- [ ] **Step 1: Tester la sélection d'une variante disponible**

Rendre `VariantPicker` avec une variante stock 2 et une variante stock 0. Vérifier que la première appelle `onSelect`, que la seconde est désactivée et que le texte `Rupture de stock` est visible.

- [ ] **Step 2: Vérifier l'échec**

Run: `pnpm test tests/unit/variant-picker.test.tsx`

Expected: FAIL car le composant n'existe pas.

- [ ] **Step 3: Implémenter les requêtes publiques**

```ts
// lib/catalog/queries.ts
import { db } from "@/lib/db";
export const listVisibleProducts = () => db.product.findMany({
  where: { isVisible: true }, include: { images: { orderBy: { position: "asc" }, take: 1 }, variants: true },
  orderBy: { createdAt: "desc" },
});
export const getVisibleProduct = (slug: string) => db.product.findFirst({
  where: { slug, isVisible: true }, include: { images: { orderBy: { position: "asc" } }, variants: { orderBy: [{ color: "asc" }, { size: "asc" }] } },
});
```

- [ ] **Step 4: Implémenter les composants et pages**

Créer des composants typés sans accès direct à Prisma. La carte affiche image, nom, prix sous la forme `1 299 DH` et lien. La fiche renvoie `notFound()` si absente, affiche la galerie, les choix couleur/pointure et bloque l'ajout lorsque le stock est nul.

- [ ] **Step 5: Tester et committer**

Run: `pnpm test tests/unit/variant-picker.test.tsx && pnpm lint`

Expected: PASS sans erreur ESLint.

```bash
git add app components/shop lib/catalog tests/unit/variant-picker.test.tsx
git commit -m "feat: add public boots catalog"
```

### Task 4: Implémenter le panier persistant

**Files:**
- Create: `components/cart/cart-types.ts`
- Create: `components/cart/cart-reducer.ts`
- Create: `components/cart/cart-provider.tsx`
- Create: `components/cart/add-to-cart.tsx`
- Create: `components/cart/cart-view.tsx`
- Create: `app/(shop)/panier/page.tsx`
- Test: `tests/unit/cart-reducer.test.ts`

- [ ] **Step 1: Écrire les tests du reducer**

Tester : ajout d'une ligne, fusion de la même variante, coexistence de variantes différentes, plafonnement à `availableStock`, suppression, calcul du total et vidage.

```ts
const item = { variantId: "v1", productSlug: "atlas", productName: "Atlas", imageUrl: "/atlas.jpg", size: "40", color: "Brun", unitPriceDh: 899, availableStock: 3 };
expect(cartReducer([], { type: "add", item, quantity: 2 })).toEqual([{ ...item, quantity: 2 }]);
expect(selectTotal([{ ...item, quantity: 2 }])).toBe(1798);
```

- [ ] **Step 2: Vérifier l'échec**

Run: `pnpm test tests/unit/cart-reducer.test.ts`

Expected: FAIL car le reducer n'existe pas.

- [ ] **Step 3: Implémenter le reducer pur puis le provider**

Le reducer expose `add`, `setQuantity`, `remove` et `clear`. `CartProvider` hydrate après montage depuis la clé `boots-cart-v1`, ignore un JSON invalide, puis sauvegarde chaque mutation dans `localStorage`.

- [ ] **Step 4: Relier la fiche produit et la page panier**

`AddToCart` reçoit l'instantané d'affichage et la variante sélectionnée. `CartView` affiche chaque ligne, contrôle quantité 1..stock, supprime une ligne, formate le total et lie vers `/commander` uniquement si le panier n'est pas vide.

- [ ] **Step 5: Tester et committer**

Run: `pnpm test tests/unit/cart-reducer.test.ts && pnpm lint`

Expected: tous les tests panier passent.

```bash
git add app components/cart components/shop tests/unit/cart-reducer.test.ts
git commit -m "feat: add persistent multi-item cart"
```

### Task 5: Valider les coordonnées marocaines

**Files:**
- Create: `lib/validation/checkout.ts`
- Test: `tests/unit/checkout-validation.test.ts`

- [ ] **Step 1: Écrire les cas de validation**

```ts
it.each(["0612345678", "0712345678", "+212612345678", "+212712345678"])("accepts %s", phone => {
  expect(checkoutSchema.safeParse({ firstName: "Sara", lastName: "Amrani", phone, address: "12 rue Atlas, Rabat", items: [{ variantId: "v1", quantity: 1 }] }).success).toBe(true);
});
it.each(["0512345678", "06123", "+33123456789"])("rejects %s", phone => expect(validMoroccanPhone(phone)).toBe(false));
```

- [ ] **Step 2: Vérifier l'échec**

Run: `pnpm test tests/unit/checkout-validation.test.ts`

Expected: FAIL car le schéma n'existe pas.

- [ ] **Step 3: Implémenter la normalisation et le schéma Zod**

`normalizeMoroccanPhone` retire espaces, tirets et points, transforme `06…`/`07…` en `+2126…`/`+2127…`, puis valide `^\+212[67]\d{8}$`. Les noms font 2 à 80 caractères, l'adresse 10 à 300, chaque quantité est un entier 1 à 20 et le panier contient 1 à 30 lignes.

- [ ] **Step 4: Tester et committer**

Run: `pnpm test tests/unit/checkout-validation.test.ts`

Expected: PASS.

```bash
git add lib/validation/checkout.ts tests/unit/checkout-validation.test.ts
git commit -m "feat: validate Moroccan checkout details"
```

### Task 6: Créer les commandes avec transaction de stock

**Files:**
- Create: `lib/orders/create-order.ts`
- Create: `lib/orders/order-number.ts`
- Create: `app/actions/create-order.ts`
- Test: `tests/integration/create-order.test.ts`

- [ ] **Step 1: Écrire les tests d'intégration PostgreSQL**

Préparer une variante à 2 unités, puis vérifier : total recalculé depuis `priceDh`, instantanés de ligne, stock décrémenté, rejet de 3 unités, absence de commande partielle et numéro conforme à `^BOT-[A-Z0-9]{10}$`.

- [ ] **Step 2: Vérifier l'échec**

Run: `pnpm test tests/integration/create-order.test.ts`

Expected: FAIL car `createOrder` n'existe pas.

- [ ] **Step 3: Implémenter la transaction**

Dans `createOrder`, parser avec `checkoutSchema`, regrouper les doublons de variante, puis utiliser `db.$transaction`. Pour chaque ligne, exécuter `productVariant.updateMany({ where: { id, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } })`; exiger `count === 1`. Recharger produit/variante, calculer le total serveur, créer commande et lignes. Lever une erreur métier `OUT_OF_STOCK` sans exposer Prisma.

- [ ] **Step 4: Implémenter la Server Action**

`app/actions/create-order.ts` accepte uniquement l'objet du formulaire, renvoie l'union `{ ok: true; number: string } | { ok: false; fieldErrors?: Record<string,string[]>; code: "INVALID" | "OUT_OF_STOCK" | "UNKNOWN" }`, journalise l'erreur interne côté serveur et appelle `revalidatePath` pour les produits concernés.

- [ ] **Step 5: Tester et committer**

Run: `pnpm test tests/integration/create-order.test.ts`

Expected: PASS, y compris le cas de concurrence.

```bash
git add lib/orders app/actions/create-order.ts tests/integration/create-order.test.ts
git commit -m "feat: create orders atomically"
```

### Task 7: Construire le tunnel de commande invité

**Files:**
- Create: `components/cart/checkout-form.tsx`
- Create: `app/(shop)/commander/page.tsx`
- Create: `app/(shop)/commande/[number]/page.tsx`
- Create: `lib/orders/queries.ts`
- Test: `tests/unit/checkout-form.test.tsx`

- [ ] **Step 1: Tester le formulaire**

Vérifier les quatre champs requis, les messages français, la désactivation pendant l'envoi, l'affichage de rupture de stock et la navigation vers `/commande/BOT-...` après succès.

- [ ] **Step 2: Vérifier l'échec**

Run: `pnpm test tests/unit/checkout-form.test.tsx`

Expected: FAIL car le composant n'existe pas.

- [ ] **Step 3: Implémenter le tunnel**

La page `/commander` redirige vers `/panier` si vide. Le formulaire présente le récapitulatif, appelle la Server Action, conserve les saisies en cas d'erreur, vide le panier uniquement après succès et navigue vers la confirmation.

- [ ] **Step 4: Limiter les données de confirmation**

`getOrderConfirmation(number)` renvoie seulement numéro, état, lignes et total ; il ne renvoie jamais adresse ou téléphone sur une URL publique. La page affiche le paiement à la livraison et conseille de conserver le numéro.

- [ ] **Step 5: Tester et committer**

Run: `pnpm test tests/unit/checkout-form.test.tsx && pnpm lint`

Expected: PASS.

```bash
git add app components/cart lib/orders/queries.ts tests/unit/checkout-form.test.tsx
git commit -m "feat: add guest checkout flow"
```

### Task 8: Protéger l'administration

**Files:**
- Create: `auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `lib/auth/require-admin.ts`
- Create: `app/admin/connexion/page.tsx`
- Create: `app/admin/(protected)/layout.tsx`
- Test: `tests/unit/auth.test.ts`

- [ ] **Step 1: Tester la vérification des identifiants**

Mocker l'Admin repository et vérifier : utilisateur inconnu refusé, mauvais mot de passe refusé, bon mot de passe renvoie `{ id, email }`, résultat sans `passwordHash`.

- [ ] **Step 2: Vérifier l'échec**

Run: `pnpm test tests/unit/auth.test.ts`

Expected: FAIL car `auth.ts` n'existe pas.

- [ ] **Step 3: Configurer Auth.js**

Utiliser le provider Credentials, Zod pour l'e-mail et le mot de passe, `bcrypt.compare`, sessions JWT, page `signIn: "/admin/connexion"`, cookies `httpOnly`, `sameSite: "lax"`, `secure` en production. Les callbacks placent `admin.id` dans la session.

- [ ] **Step 4: Protéger chaque accès admin**

`requireAdmin()` appelle `auth()` et redirige vers `/admin/connexion` sans session. Le layout protégé appelle cette garde côté serveur ; chaque Server Action admin la rappelle afin de ne pas dépendre uniquement du layout.

- [ ] **Step 5: Tester et committer**

Run: `pnpm test tests/unit/auth.test.ts && pnpm lint`

Expected: PASS.

```bash
git add auth.ts app/api/auth app/admin lib/auth tests/unit/auth.test.ts
git commit -m "feat: secure admin access"
```

### Task 9: Gérer les commandes dans l'administration

**Files:**
- Create: `lib/orders/admin-queries.ts`
- Create: `lib/orders/update-status.ts`
- Create: `app/actions/update-order-status.ts`
- Create: `app/admin/(protected)/commandes/page.tsx`
- Create: `app/admin/(protected)/commandes/[id]/page.tsx`
- Create: `components/admin/order-status-form.tsx`
- Test: `tests/integration/update-order-status.test.ts`

- [ ] **Step 1: Tester les transitions et la restauration**

Vérifier transition normale, transition interdite, annulation qui restaure chaque quantité une fois, seconde annulation sans double restauration et impossibilité d'annuler une commande livrée.

- [ ] **Step 2: Vérifier l'échec**

Run: `pnpm test tests/integration/update-order-status.test.ts`

Expected: FAIL car `updateOrderStatus` n'existe pas.

- [ ] **Step 3: Implémenter la mutation transactionnelle**

Charger la commande et ses lignes, appliquer `canTransition`, puis dans `db.$transaction` restaurer le stock avec `increment` uniquement si la cible est `CANCELLED` et `stockRestored` vaut faux ; mettre ensuite `stockRestored: true` et l'état. Retourner une erreur métier pour une transition interdite.

- [ ] **Step 4: Construire les écrans admin**

La liste accepte `status` et `q` depuis les search params, recherche numéro/nom/téléphone, pagine par 20 et affiche date, client, total, état. Le détail affiche coordonnées, lignes et formulaire des seules transitions permises, avec confirmation explicite avant annulation.

- [ ] **Step 5: Tester et committer**

Run: `pnpm test tests/integration/update-order-status.test.ts && pnpm lint`

Expected: PASS.

```bash
git add app/admin app/actions/update-order-status.ts components/admin lib/orders tests/integration/update-order-status.test.ts
git commit -m "feat: manage admin order workflow"
```

### Task 10: Administrer produits, variantes et images

**Files:**
- Create: `lib/validation/product.ts`
- Create: `lib/catalog/admin-mutations.ts`
- Create: `app/actions/save-product.ts`
- Create: `app/actions/upload-product-image.ts`
- Create: `app/admin/(protected)/produits/page.tsx`
- Create: `app/admin/(protected)/produits/nouveau/page.tsx`
- Create: `app/admin/(protected)/produits/[id]/page.tsx`
- Create: `components/admin/product-form.tsx`
- Create: `components/admin/variant-editor.tsx`
- Test: `tests/integration/save-product.test.ts`

- [ ] **Step 1: Tester les règles produit**

Vérifier slug unique, prix entier positif en DH, SKU unique, combinaison pointure/couleur unique par produit, stock entier positif ou nul, impossibilité de publier sans image ni variante.

- [ ] **Step 2: Vérifier l'échec**

Run: `pnpm test tests/integration/save-product.test.ts`

Expected: FAIL car la mutation n'existe pas.

- [ ] **Step 3: Implémenter le schéma et la mutation**

`productSchema` borne nom 2..120, description 20..3000, prix 1..1_000_000, slug en minuscules/tirets, et variantes 1..100. `saveProduct` appelle `requireAdmin`, valide, puis crée ou met à jour produit et variantes dans une transaction. Une variante référencée par une commande est désactivée ou mise à stock zéro, jamais supprimée physiquement.

- [ ] **Step 4: Implémenter l'image cloud**

`uploadProductImage` exige une session admin, accepte JPEG/PNG/WebP jusqu'à 5 Mo, génère un nom non prévisible, appelle `put("products/<uuid>.<ext>", file, { access: "public", addRandomSuffix: true })` et renvoie seulement l'URL. Ne mettre à jour le produit qu'après succès du téléversement.

- [ ] **Step 5: Construire l'interface**

Créer liste avec visibilité et stock total, formulaire produit, galerie ordonnable et éditeur de variantes. Afficher les erreurs Zod sous les champs. Une case `Visible dans la boutique` est désactivée tant que l'image ou la variante manque.

- [ ] **Step 6: Tester et committer**

Run: `pnpm test tests/integration/save-product.test.ts && pnpm lint`

Expected: PASS.

```bash
git add app/admin app/actions components/admin lib/catalog lib/validation/product.ts tests/integration/save-product.test.ts
git commit -m "feat: manage products variants and images"
```

### Task 11: Ajouter limitation d'abus, journalisation et finitions UX

**Files:**
- Create: `lib/security/rate-limit.ts`
- Modify: `app/actions/create-order.ts`
- Modify: `auth.ts`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `app/error.tsx`
- Create: `app/not-found.tsx`
- Test: `tests/unit/rate-limit.test.ts`

- [ ] **Step 1: Tester l'interface de limitation**

Avec une horloge et un store injectables, vérifier qu'une clé autorise 5 tentatives de connexion par 15 minutes et 10 commandes par 10 minutes, puis renvoie une date `retryAfter`.

- [ ] **Step 2: Vérifier l'échec**

Run: `pnpm test tests/unit/rate-limit.test.ts`

Expected: FAIL car le module n'existe pas.

- [ ] **Step 3: Implémenter un adaptateur de rate limit**

Définir `RateLimiter.consume(scope, key): Promise<{ allowed: boolean; retryAfter?: Date }>` et une implémentation de développement en mémoire. L'implémentation de production utilise `Redis.fromEnv()` de `@upstash/redis` et deux instances `Ratelimit`: `slidingWindow(5, "15 m")` pour `login` et `slidingWindow(10, "10 m")` pour `checkout`. En production, l'absence de `UPSTASH_REDIS_REST_URL` ou `UPSTASH_REDIS_REST_TOKEN` lève une erreur au chargement au lieu de désactiver la protection.

- [ ] **Step 4: Appliquer les protections et les erreurs**

Clé de connexion = IP normalisée + e-mail normalisé ; clé commande = IP normalisée + téléphone normalisé. Retourner des messages français sans révéler l'existence d'un administrateur. Ajouter pages 404/erreur, focus visible, contrastes AA, libellés, états de chargement et annonces `aria-live`.

- [ ] **Step 5: Finaliser l'identité visuelle**

Définir des tokens crème, brun cuir, noir et accent, une largeur de lecture cohérente, des images `next/image` responsives, une hiérarchie typographique éditoriale et des composants mobiles avec cibles tactiles d'au moins 44 px.

- [ ] **Step 6: Tester et committer**

Run: `pnpm test tests/unit/rate-limit.test.ts && pnpm lint && pnpm build`

Expected: PASS.

```bash
git add app auth.ts lib/security tests/unit/rate-limit.test.ts
git commit -m "feat: harden storefront and polish UX"
```

### Task 12: Vérifier les parcours complets et préparer Vercel

**Files:**
- Create: `tests/e2e/storefront.spec.ts`
- Create: `tests/e2e/admin.spec.ts`
- Create: `scripts/check-env.ts`
- Create: `README.md`
- Create: `vercel.json`
- Modify: `package.json`

- [ ] **Step 1: Écrire le parcours public Playwright**

Le test ouvre le catalogue, choisit couleur et pointure, ajoute deux variantes, modifie une quantité, remplit Sara/Amrani/0612345678/adresse, valide, puis vérifie le numéro `BOT-...`, le total DH et le panier vide.

- [ ] **Step 2: Écrire le parcours administrateur**

Le test vérifie redirection sans session, connexion, présence de la commande, passage Nouvelle → Confirmée, puis création d'un produit masqué avec deux variantes.

- [ ] **Step 3: Exécuter et corriger les parcours**

Run: `pnpm exec playwright install chromium && pnpm test:e2e`

Expected: les deux fichiers passent sur viewport mobile 390×844 et desktop 1440×900.

- [ ] **Step 4: Documenter l'exploitation**

Le README donne les commandes exactes d'installation, `.env`, migration, seed, tests et déploiement Vercel. `scripts/check-env.ts` valide `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BLOB_READ_WRITE_TOKEN`, `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` avant migration/seed.

- [ ] **Step 5: Vérifier la production localement**

Run:

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Expected: toutes les commandes sortent avec code 0.

- [ ] **Step 6: Déployer en preview et faire le smoke test**

Configurer Neon avec pooling, Vercel Blob, les secrets et Upstash Redis. Appliquer les migrations avec `prisma migrate deploy`, créer l'administrateur via le seed, déployer une preview, puis vérifier manuellement catalogue, image, commande, connexion et transition d'état.

- [ ] **Step 7: Commit final**

```bash
git add tests/e2e scripts README.md vercel.json package.json pnpm-lock.yaml
git commit -m "test: verify storefront and deployment"
```

## Revue de couverture

- Catalogue, fiche, variantes et visibilité : Tasks 2, 3 et 10.
- Panier multi-articles persistant : Task 4.
- Coordonnées invitées marocaines et paiement à la livraison : Tasks 5 et 7.
- Prix serveur, commande atomique et stock non négatif : Task 6.
- Authentification administrateur : Task 8.
- Consultation, filtrage et états des commandes : Task 9.
- Annulation et restauration unique du stock : Task 9.
- Images cloud et gestion complète du catalogue : Task 10.
- Sécurité, limitation d'abus, accessibilité et responsive : Tasks 8, 10, 11 et 12.
- PostgreSQL Neon, Vercel et vérification de production : Tasks 1, 2 et 12.
