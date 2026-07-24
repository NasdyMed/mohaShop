import { describe, expect, it } from "vitest";
import { productInputSchema } from "@/lib/validation/product";
const base={name:"Bottes",description:"Description suffisamment longue.",priceDh:500,slug:"bottes",isVisible:false,variants:[{sku:"BOTTE-38-NOIR",size:"38",color:"Noir",stock:1}]};
const parse=(url:string)=>productInputSchema.safeParse({...base,images:[{url,alt:"Botte",color:"Noir",position:0}]}).success;
describe("URL d'image produit",()=>{
 it.each(["https://images.unsplash.com/a","https://shop.public.blob.vercel-storage.com/a"])("accepte %s",url=>expect(parse(url)).toBe(true));
 it.each(["https://user:pass@images.unsplash.com/a","https://images.unsplash.com:444/a","https://a.b.public.blob.vercel-storage.com/a","https://public.blob.vercel-storage.com/a","https://shop.public.blob.vercel-storage.com.evil.test/a","https://evil-images.unsplash.com/a"])("rejette %s",url=>expect(parse(url)).toBe(false));
});
