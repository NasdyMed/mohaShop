"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { saveProductAction } from "@/app/actions/save-product";
import { uploadProductImageAction } from "@/app/actions/upload-product-image";
import { LoadingLabel } from "@/components/ui/loading-label";
import { normalizeKnownProductColor, normalizeProductColor } from "@/lib/catalog/color-swatches";
import { EditableImage, MAX_IMAGES_PER_COLOR, moveImageWithinColor, normalizeImagePositions, orderImagesByColor } from "@/lib/catalog/product-image-groups";
import { ProductImageGroups } from "./product-image-groups";
import { EditableVariant, VariantEditor } from "./variant-editor";

type Value = { id?: string; name: string; nameAr: string; description: string; descriptionAr: string; priceDh: number; slug: string; isVisible: boolean; images: EditableImage[]; variants: EditableVariant[] };
type Errors = Record<string, string[]>;
const empty: Value = { name: "", nameAr: "", description: "", descriptionAr: "", priceDh: 1, slug: "", isVisible: false, images: [], variants: [] };
const FieldError = ({ errors, id }: { errors?: string[]; id?: string }) => errors?.map((error, index) => <p className="field-error" id={index === 0 ? id : undefined} key={error}>{error}</p>);

export function ProductForm({ initialValue }: { initialValue?: Value }) {
  const router = useRouter();
  const [value, setValue] = useState<Value>(() => {
    const initial = initialValue ?? empty;
    const variants = initial.variants.map((variant) => ({ ...variant, color: normalizeProductColor(variant.color) }));
    const firstColor = variants[0]?.color ?? null;
    const colors = [...new Set(variants.filter((variant) => !variant.removed).map((variant) => variant.color))];
    const images = initial.images.map((image) => ({
      ...image,
      color: (() => {
        const source = image.color || firstColor || "";
        const canonical = normalizeKnownProductColor(source);
        return canonical && colors.includes(canonical) ? canonical : source.trim();
      })(),
    }));
    return { ...initial, images: orderImagesByColor(images, colors), variants };
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const operationLock = useRef(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const activeVariants = value.variants.filter((variant) => !variant.removed);
  const canPublish = value.images.length > 0 && activeVariants.length > 0;
  const colors = [...new Set(activeVariants.map((variant) => variant.color))];

  async function uploadImages(color: string, requestedFiles: File[]) {
    const files = requestedFiles.slice(0, Math.max(0, MAX_IMAGES_PER_COLOR - value.images.filter((image) => image.color === color).length));
    if (!files.length || uploading) return;
    setUploading(true);
    setUploadError("");
    setMessage("");
    const preferredColor = color;
    const added: EditableImage[] = [];
    try {
      for (const file of files) {
        const data = new FormData();
        data.set("file", file);
        try {
          const result = await uploadProductImageAction(data);
          if (!result.ok) { setMessage(result.message); continue; }
          added.push({ url: result.url, alt: `${value.name || "Produit"} — ${file.name.replace(/\.[^.]+$/, "")}`, color: preferredColor, position: value.images.length + added.length });
        } catch {
          setMessage("L’import a échoué. Vérifiez la configuration Vercel Blob puis réessayez.");
        }
      }
      if (added.length) setValue((current) => {
        const activeColors = [...new Set(current.variants.filter((variant) => !variant.removed).map((variant) => variant.color))];
        const color = preferredColor && activeColors.includes(preferredColor) ? preferredColor : activeColors[0];
        if (!color) {
          setUploadError("Aucune couleur active. Ajoutez une déclinaison avant d’importer une image.");
          return current;
        }
        const capacity = Math.max(0, MAX_IMAGES_PER_COLOR - current.images.filter((image) => image.color === color).length);
        const accepted = added.slice(0, capacity);
        if (!accepted.length) {
          setUploadError(`Maximum ${MAX_IMAGES_PER_COLOR} images par couleur.`);
          return current;
        }
        if (accepted.length < added.length) setUploadError(`Maximum ${MAX_IMAGES_PER_COLOR} images par couleur.`);
        return {
          ...current,
          images: orderImagesByColor([...current.images, ...accepted.map((image) => ({ ...image, color }))], activeColors),
        };
      });
    } catch {
      setMessage("L’import a échoué. Vérifiez la configuration Vercel Blob puis réessayez.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || uploading || operationLock.current) return;
    operationLock.current = true;
    setBusy(true);
    setMessage("");
    setErrors({});
    try {
      const variants = value.variants
        .filter((variant) => !variant.removed || variant.historical)
        .map(({ id, sku, size, color, stock, removed }) => ({
          ...(id ? { id } : {}),
          sku, size, color, stock: removed ? 0 : stock,
        }));
      const selectedColors = [...new Set(value.variants.filter((variant) => !variant.removed).map((variant) => variant.color))];
      const result = await saveProductAction({ ...value, images: orderImagesByColor(value.images, selectedColors), variants });
      if (!result.ok) {
        setMessage(result.message);
        setErrors(result.fieldErrors);
        return;
      }
      router.push(`/admin/produits/${result.id}?saved=1`);
      router.refresh();
    } catch {
      setMessage("L’état de l’enregistrement est incertain. Vérifiez le produit avant de réessayer.");
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
  }

  return <form className="product-form" onSubmit={submit} aria-busy={busy}>
    {message && <p role="alert" className="form-error-summary">{message}</p>}
    {uploadError && <p role="alert" className="form-error-summary">{uploadError}</p>}
    <FieldError errors={errors.form}/>
    <section className="admin-form-card" aria-labelledby="product-details-title">
      <div className="admin-section-heading"><div><span className="admin-section-index">01</span><h2 id="product-details-title">Informations</h2></div><p>Les informations essentielles présentées dans la boutique.</p></div>
      <div className="product-fields-grid">
        <label>Nom<input disabled={busy || uploading} required minLength={2} maxLength={120} aria-invalid={!!errors.name} aria-describedby={errors.name ? "product-name-error" : undefined} value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })}/></label><FieldError id="product-name-error" errors={errors.name}/>
        <label>Nom en arabe<input dir="rtl" disabled={busy || uploading} minLength={2} maxLength={120} aria-invalid={!!errors.nameAr} aria-describedby={errors.nameAr ? "product-name-ar-error" : undefined} value={value.nameAr} onChange={(event) => setValue({ ...value, nameAr: event.target.value })}/></label><FieldError id="product-name-ar-error" errors={errors.nameAr}/>
        <label>Slug<input disabled={busy || uploading} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} aria-invalid={!!errors.slug} aria-describedby={errors.slug ? "product-slug-error" : undefined} value={value.slug} onChange={(event) => setValue({ ...value, slug: event.target.value })}/></label><FieldError id="product-slug-error" errors={errors.slug}/>
        <label>Prix (DH)<input disabled={busy || uploading} required type="number" min={1} max={1_000_000} aria-invalid={!!errors.priceDh} aria-describedby={errors.priceDh ? "product-price-error" : undefined} value={value.priceDh} onChange={(event) => setValue({ ...value, priceDh: Number(event.target.value) })}/></label><FieldError id="product-price-error" errors={errors.priceDh}/>
        <label className="product-description-field">Description<textarea disabled={busy || uploading} required minLength={20} maxLength={3000} rows={6} aria-invalid={!!errors.description} aria-describedby={errors.description ? "product-description-error" : undefined} value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })}/></label><FieldError id="product-description-error" errors={errors.description}/>
        <label className="product-description-field">Description en arabe<textarea dir="rtl" disabled={busy || uploading} minLength={20} maxLength={3000} rows={6} aria-invalid={!!errors.descriptionAr} aria-describedby={errors.descriptionAr ? "product-description-ar-error" : undefined} value={value.descriptionAr} onChange={(event) => setValue({ ...value, descriptionAr: event.target.value })}/></label><FieldError id="product-description-ar-error" errors={errors.descriptionAr}/>
      </div>
      <p className="admin-inline-note">Le contenu français sera utilisé dans la boutique arabe si une traduction est vide.</p>
      <div className="product-visibility-row">
        <div><strong>Publication</strong><span>{value.isVisible ? "Le produit est visible dans la boutique." : "Le produit reste en brouillon."}</span></div>
        <label className="admin-switch"><input disabled={busy || uploading || (!value.isVisible && !canPublish)} type="checkbox" checked={value.isVisible} onChange={(event) => setValue({ ...value, isVisible: event.target.checked })}/><span aria-hidden="true"/><b>Produit visible</b></label>
      </div>
      <FieldError errors={errors.isVisible}/>
      {!canPublish && <p className="admin-inline-note">Ajoutez une image et une déclinaison pour publier. Le brouillon reste enregistrable.</p>}
    </section>

    <VariantEditor productSlug={value.slug} value={value.variants} onChange={(variants) => {
      const hasActiveVariants = variants.some((variant) => !variant.removed);
      const selectedColors = [...new Set(variants.filter((variant) => !variant.removed).map((variant) => variant.color))];
      setValue({ ...value, variants, images: orderImagesByColor(value.images, selectedColors), isVisible: value.isVisible && hasActiveVariants && value.images.length > 0 });
    }} disabled={busy || uploading} errors={errors} protectedColors={new Set(value.images.flatMap((image) => image.color ? [image.color] : []))}
      onConfirmedColorRemoval={(color) => setValue((current) => {
        const images = normalizeImagePositions(current.images.filter((image) => image.color !== color));
        return { ...current, images, isVisible: current.isVisible && images.length > 0 };
      })}/>

    <section className="admin-form-card" aria-labelledby="product-images-title">
      <div className="admin-section-heading"><div><span className="admin-section-index">03</span><h2 id="product-images-title">Images</h2></div><p>La première image devient la couverture du produit.</p></div>
      <FieldError errors={errors.images}/>
      <ProductImageGroups colors={colors} images={value.images} disabled={busy} uploading={uploading} errors={errors}
        onUploadFiles={uploadImages}
        onChangeAlt={(selected, alt) => setValue((current) => ({ ...current, images: current.images.map((image) => image === selected ? { ...image, alt } : image) }))}
        onMoveWithinColor={(color, index, delta) => setValue((current) => ({ ...current, images: moveImageWithinColor(current.images, colors, color, index, delta) }))}
        onDelete={(selected) => setValue((current) => {
          const images = normalizeImagePositions(current.images.filter((image) => image !== selected));
          return { ...current, images, isVisible: current.isVisible && images.length > 0 };
        })}/>
    </section>
    <div className="admin-form-actions"><p>{value.isVisible ? "Les modifications seront visibles immédiatement." : "Ce produit sera enregistré en brouillon."}</p><button className="admin-submit" disabled={busy || uploading}>{busy ? <LoadingLabel>Enregistrement…</LoadingLabel> : "Enregistrer le produit"}</button></div>
  </form>;
}
