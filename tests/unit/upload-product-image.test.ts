import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), put: vi.fn(), randomUUID: vi.fn(() => "12345678-1234-4234-8234-123456789abc") }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@vercel/blob", () => ({ put: mocks.put }));
vi.mock("node:crypto", async (importOriginal) => ({ ...await importOriginal<typeof import("node:crypto")>(), randomUUID: mocks.randomUUID }));
import { uploadProductImageAction } from "@/app/actions/upload-product-image";
const signatures = { "image/jpeg": [0xff,0xd8,0xff], "image/png": [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a], "image/webp": [0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50] } as const;
describe("uploadProductImageAction", () => {
 beforeEach(() => vi.clearAllMocks());
 it("authentifie avant de lire le formulaire", async()=>{mocks.requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));const form={get:vi.fn()} as unknown as FormData;await expect(uploadProductImageAction(form)).rejects.toThrow("NEXT_REDIRECT");expect(form.get).not.toHaveBeenCalled()});
 it.each(Object.keys(signatures))("rejette les faux octets déclarés %s",async(type)=>{mocks.requireAdmin.mockResolvedValue({});const form=new FormData();form.set("file",new File(["not-image"],"x",{type}));expect((await uploadProductImageAction(form)).ok).toBe(false);expect(mocks.put).not.toHaveBeenCalled()});
 it.each(Object.entries(signatures))("accepte la signature %s",async(type,bytes)=>{mocks.requireAdmin.mockResolvedValue({});mocks.put.mockResolvedValue({url:"https://x.public.blob.vercel-storage.com/a"});const form=new FormData();form.set("file",new File([new Uint8Array(bytes)],"x",{type}));expect((await uploadProductImageAction(form)).ok).toBe(true)});
 it("utilise un chemin aléatoire sans le nom original",async()=>{mocks.requireAdmin.mockResolvedValue({});mocks.put.mockResolvedValue({url:"https://x.public.blob.vercel-storage.com/a"});const form=new FormData();const file=new File([new Uint8Array(signatures["image/webp"])],"secret.webp",{type:"image/webp"});form.set("file",file);await uploadProductImageAction(form);const [path,body,options]=mocks.put.mock.calls[0];expect(path).toMatch(/^products\/[0-9a-f-]{36}\.webp$/);expect(path).not.toContain("secret");expect(body).toBe(file);expect(options).toEqual({access:"public",addRandomSuffix:true})});
 it("conserve les contrôles de type et taille",async()=>{mocks.requireAdmin.mockResolvedValue({});const bad=new FormData();bad.set("file",new File(["x"],"x.svg",{type:"image/svg+xml"}));expect((await uploadProductImageAction(bad)).ok).toBe(false);const huge=new FormData();huge.set("file",new File([new Uint8Array(5*1024*1024+1)],"x.jpg",{type:"image/jpeg"}));expect((await uploadProductImageAction(huge)).ok).toBe(false);expect(mocks.put).not.toHaveBeenCalled()});
});
