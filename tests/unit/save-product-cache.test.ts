import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({requireAdmin:vi.fn(),saveProduct:vi.fn(),revalidatePath:vi.fn()}));
vi.mock("@/lib/auth/require-admin",()=>({requireAdmin:mocks.requireAdmin}));
vi.mock("@/lib/catalog/admin-mutations",()=>({saveProduct:mocks.saveProduct,ProductMutationError:class extends Error{code="UNKNOWN"}}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidatePath}));
import { saveProductAction } from "@/app/actions/save-product";
const input={name:"Bottes",description:"Description suffisamment longue.",priceDh:500,slug:"nouveau",isVisible:false,images:[],variants:[]};
describe("invalidation lors d'un changement de slug",()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.requireAdmin.mockResolvedValue({})});
 it("essaie les anciens et nouveaux chemins indépendamment sans journaliser leurs valeurs",async()=>{mocks.saveProduct.mockResolvedValue({id:"secret-id",slug:"nouveau-secret",previousSlug:"ancien-secret"});mocks.revalidatePath.mockImplementation(()=>{throw new Error("cache")});const log=vi.spyOn(console,"error").mockImplementation(()=>undefined);await saveProductAction(input);expect(mocks.revalidatePath).toHaveBeenCalledWith("/produits/nouveau-secret");expect(mocks.revalidatePath).toHaveBeenCalledWith("/produits/ancien-secret");expect(mocks.revalidatePath).toHaveBeenCalledTimes(5);expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret-id|nouveau-secret|ancien-secret/);log.mockRestore()});
});
