"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { saveProductAction } from "@/app/actions/save-product";
import { uploadProductImageAction } from "@/app/actions/upload-product-image";
import { LoadingLabel } from "@/components/ui/loading-label";
import { colorSwatch, normalizeProductColor } from "@/lib/catalog/color-swatches";
import { EditableVariant, VariantEditor } from "./variant-editor";

type EditableImage = { id?: string; url: string; alt: string; color?: string | null; position: number };
type Value = { id?: string; name: string; description: string; priceDh: number; slug: string; isVisible: boolean; images: EditableImage[]; variants: EditableVariant[] };
type Errors = Record<string, string[]>;
const empty: Value = { name: "", description: "", priceDh: 1, slug: "", isVisible: false, images: [], variants: [] };
const FieldError = ({ errors, id }: { errors?: string[]; id?: string }) => errors?.map((error, index) => <p className="field-error" id={index === 0 ? id : undefined} key={error}>{error}</p>);

function ArrowIcon({ direction }: { direction: "up" | "down" }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={direction === "up" ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"}/></svg>;
}
function TrashIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>;
}

export function ProductForm({ initialValue }: { initialValue?: Value }) {
  const router = useRouter();
  const [value, setValue] = useState<Value>(() => {
    const initial = initialValue ?? empty;
    return { ...initial, images: initial.images.map((image) => ({ ...image, color: image.color ?? null })), variants: initial.variants.map((variant) => ({ ...variant, color: normalizeProductColor(variant.color) })) };
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const operationLock = useRef(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const canPublish = value.images.length > 0 && value.variants.length > 0;
  const colors = [...new Set(value.variants.map((variant) => variant.color))];

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.images.length) return;
    const images = [...value.images];
    [images[index], images[target]] = [images[target], images[index]];
    setValue({ ...value, images: images.map((image, position) => ({ ...image, position })) });
  };

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])].slice(0, Math.max(0, 10 - value.images.length));
    event.target.value = "";
    if (!files.length || uploading) return;
    setUploading(true);
    setMessage("");
    const added: EditableImage[] = [];
    try {
      for (const file of files) {
        const data = new FormData();
        data.set("file", file);
        const result = await uploadProductImageAction(data);
        if (!result.ok) { setMessage(result.message); continue; }
        added.push({ url: result.url, alt: `${value.name || "Produit"} — ${file.name.replace(/\.[^.]+$/, "")}`, color: null, position: value.images.length + added.length });
      }
      if (added.length) setValue((current) => ({ ...current, images: [...current.images, ...added].map((image, position) => ({ ...image, position })) }));
    } catch {
      setMessage("L’import a échoué. Vérifiez la configuration Vercel Blob puis réessayez.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || operationLock.current) return;
    operationLock.current = true;
    setBusy(true);
    setMessage("");
    setErrors({});
    try {
      const result = await saveProductAction({ ...value, variants: value.variants.map(({ id, sku, size, color, stock }) => ({ ...(id ? { id } : {}), sku, size, color, stock })) });
      if (!result.ok) {
        setMessage(result.message);
        setErrors(result.fieldErrors);
        return;
      }
      router.push(`/admin/produits/${result.id}`);
      router.refresh();
    } catch {
      setMessage("L’état de l’enregistrement est incertain. Vérifiez le produit avant de réessayer.");
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
  }

  return <form className="product-form" onSubmit={submit} aria-busy={busy}>
    {message && <p role="alert" className="form-error-summary">{message}</p>}<FieldError errors={errors.form}/>
    <section className="admin-form-card" aria-labelledby="product-details-title">
      <div className="admin-section-heading"><div><span className="admin-section-index">01</span><h2 id="product-details-title">Informations</h2></div><p>Les informations essentielles présentées dans la boutique.</p></div>
      <div className="product-fields-grid">
        <label>Nom<input disabled={busy} required minLength={2} maxLength={120} aria-invalid={!!errors.name} aria-describedby={errors.name ? "product-name-error" : undefined} value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })}/></label><FieldError id="product-name-error" errors={errors.name}/>
        <label>Slug<input disabled={busy} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} aria-invalid={!!errors.slug} aria-describedby={errors.slug ? "product-slug-error" : undefined} value={value.slug} onChange={(event) => setValue({ ...value, slug: event.target.value })}/></label><FieldError id="product-slug-error" errors={errors.slug}/>
        <label>Prix (DH)<input disabled={busy} required type="number" min={1} max={1_000_000} aria-invalid={!!errors.priceDh} aria-describedby={errors.priceDh ? "product-price-error" : undefined} value={value.priceDh} onChange={(event) => setValue({ ...value, priceDh: Number(event.target.value) })}/></label><FieldError id="product-price-error" errors={errors.priceDh}/>
        <label className="product-description-field">Description<textarea disabled={busy} required minLength={20} maxLength={3000} rows={6} aria-invalid={!!errors.description} aria-describedby={errors.description ? "product-description-error" : undefined} value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })}/></label><FieldError id="product-description-error" errors={errors.description}/>
      </div>
      <div className="product-visibility-row">
        <div><strong>Publication</strong><span>{value.isVisible ? "Le produit est visible dans la boutique." : "Le produit reste en brouillon."}</span></div>
        <label className="admin-switch"><input disabled={busy || (!value.isVisible && !canPublish)} type="checkbox" checked={value.isVisible} onChange={(event) => setValue({ ...value, isVisible: event.target.checked })}/><span aria-hidden="true"/><b>Produit visible</b></label>
      </div>
      <FieldError errors={errors.isVisible}/>
      {!canPublish && <p className="admin-inline-note">Ajoutez une image et une déclinaison pour publier. Le brouillon reste enregistrable.</p>}
    </section>

    <section className="admin-form-card" aria-labelledby="product-images-title">
      <div className="admin-section-heading"><div><span className="admin-section-index">02</span><h2 id="product-images-title">Images</h2></div><p>La première image devient la couverture du produit.</p></div>
      <FieldError errors={errors.images}/>
      <div className="admin-upload-state">
        <input ref={fileInput} className="visually-hidden" aria-label="Téléverser des images" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || uploading || value.images.length >= 10} onChange={uploadImages}/>
        <button className="admin-outline-button" type="button" disabled={busy || uploading || value.images.length >= 10} onClick={() => fileInput.current?.click()}>{uploading ? <LoadingLabel>Import en cours…</LoadingLabel> : <><span aria-hidden="true">＋</span> Ajouter des images</>}</button>
        <p><strong>JPEG, PNG ou WebP · 5 Mio maximum.</strong> Jusqu’à 10 visuels, généraux ou associés à une couleur.</p>
      </div>
      {value.images.length === 0 ? <div className="admin-image-empty"><span aria-hidden="true">◇</span><strong>Aucune image</strong><p>Importez un premier visuel pour préparer la fiche produit.</p></div> :
        <div className="admin-image-gallery" role="region" aria-label="Images du produit">
          {value.images.map((image, index) => <article className="admin-image-card" key={image.id ?? image.url}>
            <a className="admin-image-preview" href={image.url} target="_blank" rel="noreferrer" aria-label={`Ouvrir l’image ${index + 1}`}>
              <Image src={image.url} alt={image.alt} width={420} height={320}/>{index === 0 && <span>Couverture</span>}
            </a>
            <div className="admin-image-card-body">
              <label>Texte alternatif<input disabled={busy} required minLength={2} maxLength={160} aria-invalid={!!errors[`images.${index}.alt`]} aria-describedby={errors[`images.${index}.alt`] ? `product-image-${index}-alt-error` : undefined} value={image.alt} onChange={(event) => setValue({ ...value, images: value.images.map((item, current) => current === index ? { ...item, alt: event.target.value } : item) })}/></label>
              <fieldset className="admin-image-color-picker"><legend>Visuel pour <strong>{image.color ?? "Toutes les couleurs"}</strong></legend><div className="admin-image-color-options">
                <label className="admin-color-option is-general" title="Toutes les couleurs"><input type="radio" name={`image-color-${index}`} aria-label="Toutes les couleurs" checked={image.color == null} disabled={busy} onChange={() => setValue({ ...value, images: value.images.map((item, current) => current === index ? { ...item, color: null } : item) })}/><span aria-hidden="true">Toutes</span></label>
                {colors.map((color) => <label className="admin-color-option" title={color} key={color}><input type="radio" name={`image-color-${index}`} aria-label={color} checked={image.color === color} disabled={busy} onChange={() => setValue({ ...value, images: value.images.map((item, current) => current === index ? { ...item, color } : item) })}/><span style={{ backgroundColor: colorSwatch(color).background }} aria-hidden="true"/></label>)}
              </div></fieldset>
              <FieldError id={`product-image-${index}-alt-error`} errors={errors[`images.${index}.alt`]}/><FieldError errors={errors[`images.${index}.url`]}/><FieldError errors={errors[`images.${index}.position`]}/><FieldError errors={errors[`images.${index}.id`]}/>
              <div className="admin-image-actions">
                <button className="admin-icon-button" aria-label={`Déplacer l’image ${index + 1} vers le haut`} title="Monter" disabled={busy || index === 0} type="button" onClick={() => move(index, -1)}><ArrowIcon direction="up"/></button>
                <button className="admin-icon-button" aria-label={`Déplacer l’image ${index + 1} vers le bas`} title="Descendre" disabled={busy || index === value.images.length - 1} type="button" onClick={() => move(index, 1)}><ArrowIcon direction="down"/></button>
                <button className="admin-icon-button is-danger" aria-label={`Supprimer l’image ${index + 1}`} title="Supprimer" disabled={busy} type="button" onClick={() => setValue({ ...value, isVisible: false, images: value.images.filter((_, current) => current !== index).map((item, position) => ({ ...item, position })) })}><TrashIcon/></button>
              </div>
            </div>
          </article>)}
        </div>}
    </section>
    <VariantEditor value={value.variants} onChange={(variants) => setValue({ ...value, variants, isVisible: value.isVisible && variants.length > 0 && value.images.length > 0 })} disabled={busy} errors={errors}/>
    <div className="admin-form-actions"><p>{value.isVisible ? "Les modifications seront visibles immédiatement." : "Ce produit sera enregistré en brouillon."}</p><button className="admin-submit" disabled={busy}>{busy ? <LoadingLabel>Enregistrement…</LoadingLabel> : "Enregistrer le produit"}</button></div>
  </form>;
}
