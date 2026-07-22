"use client";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveProductAction } from "@/app/actions/save-product";
import { uploadProductImageAction } from "@/app/actions/upload-product-image";
import { LoadingLabel } from "@/components/ui/loading-label";
import { EditableVariant, VariantEditor } from "./variant-editor";

type EditableImage = { id?: string; url: string; alt: string; position: number };
type Value = { id?: string; name: string; description: string; priceDh: number; slug: string; isVisible: boolean; images: EditableImage[]; variants: EditableVariant[] };
type Errors = Record<string, string[]>;
const empty: Value = { name: "", description: "", priceDh: 1, slug: "", isVisible: false, images: [], variants: [] };
const FieldError = ({ errors, id }: { errors?: string[]; id?: string }) => errors?.map((error, index) => <p className="field-error" id={index === 0 ? id : undefined} key={error}>{error}</p>);

export function ProductForm({ initialValue }: { initialValue?: Value }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue ?? empty);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const operationLock = useRef(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const locked = busy || uploading;
  const canPublish = value.images.length > 0 && value.variants.length > 0;
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.images.length) return;
    const images = [...value.images];
    [images[index], images[target]] = [images[target], images[index]];
    setValue({ ...value, images: images.map((image, position) => ({ ...image, position })) });
  };
  async function upload(file?: File) {
    if (!file || operationLock.current) return;
    operationLock.current = true; setUploading(true); setMessage("");
    const data = new FormData(); data.set("file", file);
    try {
      const result = await uploadProductImageAction(data);
      if (result.ok) setValue((current) => ({ ...current, images: [...current.images, { url: result.url, alt: current.name || "Image du produit", position: current.images.length }] }));
      else setMessage(result.message);
    } catch { setMessage("Le téléversement a échoué. Réessayez."); }
    finally { operationLock.current = false; setUploading(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked || operationLock.current) return;
    operationLock.current = true; setBusy(true); setMessage(""); setErrors({});
    try {
      const result = await saveProductAction({ ...value, variants: value.variants.map(({ id, sku, size, color, stock }) => ({ id, sku, size, color, stock })) });
      if (!result.ok) { setMessage(result.message); setErrors(result.fieldErrors); return; }
      router.push(`/admin/produits/${result.id}`); router.refresh();
    } catch { setMessage("L’état de l’enregistrement est incertain. Vérifiez le produit avant de réessayer."); }
    finally { operationLock.current = false; setBusy(false); }
  }
  return <form className="product-form" onSubmit={submit} aria-busy={locked}>
    {message && <p role="alert" className="form-error-summary">{message}</p>}<FieldError errors={errors.form}/>
    <label>Nom<input disabled={locked} required minLength={2} maxLength={120} aria-invalid={!!errors.name} aria-describedby={errors.name ? "product-name-error" : undefined} value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })}/></label><FieldError id="product-name-error" errors={errors.name}/>
    <label>Slug<input disabled={locked} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} aria-invalid={!!errors.slug} aria-describedby={errors.slug ? "product-slug-error" : undefined} value={value.slug} onChange={(event) => setValue({ ...value, slug: event.target.value })}/></label><FieldError id="product-slug-error" errors={errors.slug}/>
    <label>Prix (DH)<input disabled={locked} required type="number" min={1} max={1_000_000} aria-invalid={!!errors.priceDh} aria-describedby={errors.priceDh ? "product-price-error" : undefined} value={value.priceDh} onChange={(event) => setValue({ ...value, priceDh: Number(event.target.value) })}/></label><FieldError id="product-price-error" errors={errors.priceDh}/>
    <label>Description<textarea disabled={locked} required minLength={20} maxLength={3000} rows={8} aria-invalid={!!errors.description} aria-describedby={errors.description ? "product-description-error" : undefined} value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })}/></label><FieldError id="product-description-error" errors={errors.description}/>
    <label><input disabled={locked || (!value.isVisible && !canPublish)} type="checkbox" checked={value.isVisible} onChange={(event) => setValue({ ...value, isVisible: event.target.checked })}/> Produit visible</label><FieldError errors={errors.isVisible}/>
    {!canPublish && <p>Ajoutez une image et une déclinaison pour publier. Le brouillon reste enregistrable.</p>}
    <section><h2>Images</h2><FieldError errors={errors.images}/>
      <label className="secondary-link">{uploading ? <LoadingLabel>Téléversement…</LoadingLabel> : "Téléverser une image"}<input className="sr-only" disabled={locked || value.images.length >= 10} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])}/></label>
      {value.images.map((image, index) => <div className="admin-image-row" key={image.id ?? image.url}>
        <a href={image.url} target="_blank" rel="noreferrer">Aperçu {index + 1}</a><FieldError errors={errors[`images.${index}.url`]}/><FieldError errors={errors[`images.${index}.position`]}/><FieldError errors={errors[`images.${index}.id`]}/>
        <label>Texte alternatif<input disabled={locked} required minLength={2} maxLength={160} aria-invalid={!!errors[`images.${index}.alt`]} aria-describedby={errors[`images.${index}.alt`] ? `product-image-${index}-alt-error` : undefined} value={image.alt} onChange={(event) => setValue({ ...value, images: value.images.map((item, current) => current === index ? { ...item, alt: event.target.value } : item) })}/></label><FieldError id={`product-image-${index}-alt-error`} errors={errors[`images.${index}.alt`]}/>
        <button disabled={locked || index === 0} type="button" onClick={() => move(index, -1)}>Monter</button><button disabled={locked || index === value.images.length - 1} type="button" onClick={() => move(index, 1)}>Descendre</button>
        <button disabled={locked} type="button" onClick={() => setValue({ ...value, images: value.images.filter((_, current) => current !== index).map((item, position) => ({ ...item, position })) })}>Retirer</button>
      </div>)}
    </section>
    <VariantEditor value={value.variants} onChange={(variants) => setValue({ ...value, variants })} disabled={locked} errors={errors}/>
    <button className="admin-submit" disabled={locked}>{busy ? <LoadingLabel>Enregistrement…</LoadingLabel> : "Enregistrer"}</button>
  </form>;
}
