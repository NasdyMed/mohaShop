import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), saveProduct: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/catalog/admin-mutations", () => ({ saveProduct: mocks.saveProduct, ProductMutationError: class extends Error { constructor(public code: string) { super(code); } } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
import { saveProductAction } from "@/app/actions/save-product";
import { ProductMutationError } from "@/lib/catalog/admin-mutations";
const input = { name: "Bottes", description: "Description suffisamment longue.", priceDh: 500, slug: "bottes", isVisible: false, images: [], variants: [] };
describe("saveProductAction", () => {
  beforeEach(() => vi.clearAllMocks());
  it("authentifie avant de valider", async () => { mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT")); await expect(saveProductAction({})).rejects.toThrow("NEXT_REDIRECT"); expect(mocks.saveProduct).not.toHaveBeenCalled(); });
  it("retourne les erreurs de champ en français", async () => { mocks.requireAdmin.mockResolvedValue({}); const result = await saveProductAction({ ...input, slug: "Mauvais slug" }); expect(result.ok).toBe(false); if (!result.ok) expect(result.fieldErrors.slug?.[0]).toContain("Slug"); });
  it("sérialise les erreurs imbriquées avec leur chemin complet", async () => {
    mocks.requireAdmin.mockResolvedValue({});
    const result = await saveProductAction({ ...input, priceDh: 1.5, description: "court", isVisible: true, images: [{ url: "https://example.com/a.webp", alt: "", position: 0 }], variants: [{ sku: "OK", size: "38", color: "Noir", stock: -1 }] });
    expect(result).toMatchObject({ ok: false, fieldErrors: { priceDh: expect.any(Array), description: expect.any(Array), "images.0.alt": expect.any(Array), "variants.0.stock": expect.any(Array) } });
  });
  it("mappe les conflits sans fuite", async () => { mocks.requireAdmin.mockResolvedValue({}); mocks.saveProduct.mockRejectedValue(new ProductMutationError("DUPLICATE_SKU")); await expect(saveProductAction(input)).resolves.toMatchObject({ ok: false, code: "DUPLICATE_SKU" }); });
  it("conserve le succès si une invalidation échoue", async () => { mocks.requireAdmin.mockResolvedValue({}); mocks.saveProduct.mockResolvedValue({ id: "abc", slug: "bottes" }); mocks.revalidatePath.mockImplementation(() => { throw new Error("x"); }); const log = vi.spyOn(console, "error").mockImplementation(() => undefined); await expect(saveProductAction(input)).resolves.toEqual({ ok: true, id: "abc", slug: "bottes" }); expect(mocks.revalidatePath).toHaveBeenCalledTimes(4); expect(JSON.stringify(log.mock.calls)).not.toContain("abc"); log.mockRestore(); });
});
