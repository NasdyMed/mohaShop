"use client";

import Image from "next/image";
import { KeyboardEvent, useRef, useState } from "react";

import { colorSwatch } from "@/lib/catalog/color-swatches";
import { EditableImage, groupImagesByColor, MAX_IMAGES_PER_COLOR } from "@/lib/catalog/product-image-groups";
import { LoadingLabel } from "@/components/ui/loading-label";

type Props = {
  colors: string[];
  images: EditableImage[];
  disabled?: boolean;
  uploading?: boolean;
  errors: Record<string, string[]>;
  onUploadFiles: (color: string, files: File[]) => void;
  onChangeAlt: (image: EditableImage, alt: string) => void;
  onMoveWithinColor: (color: string, index: number, delta: number) => void;
  onDelete: (image: EditableImage) => void;
};

const FieldErrors = ({ values, id }: { values?: string[]; id?: string }) => values?.map((value, index) =>
  <p className="field-error" id={index === 0 ? id : undefined} key={value}>{value}</p>);

function Arrow({ down = false }: { down?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={down ? "m6 9 6 6 6-6" : "m6 15 6-6 6 6"}/></svg>;
}

export function ProductImageGroups(props: Props) {
  const [activeColor, setActiveColor] = useState(props.colors[0] ?? "");
  const input = useRef<HTMLInputElement>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedColor = props.colors.includes(activeColor) ? activeColor : (props.colors[0] ?? "");
  const groups = groupImagesByColor(props.images, props.colors);
  const active = groups.find((group) => group.color === selectedColor) ?? groups[0];
  const count = active?.images.length ?? 0;

  if (!props.colors.length) return <div className="admin-image-empty"><span aria-hidden="true">◇</span><strong>Aucune couleur active</strong><p>Ajoutez une déclinaison avant d’importer des images.</p></div>;
  return <div className="product-image-groups">
    <div className="product-image-tabs" role="tablist" aria-label="Couleurs des images">
      {groups.map((group, index) => {
        const selected = group.color === selectedColor;
        const tabId = `product-images-tab-${index}`;
        const panelId = `product-images-panel-${index}`;
        const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
          let next = index;
          if (event.key === "ArrowRight") next = (index + 1) % groups.length;
          else if (event.key === "ArrowLeft") next = (index - 1 + groups.length) % groups.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = groups.length - 1;
          else return;
          event.preventDefault();
          setActiveColor(groups[next].color);
          tabs.current[next]?.focus();
        };
        return <button type="button" role="tab" id={tabId} aria-controls={panelId} aria-selected={selected}
        tabIndex={selected ? 0 : -1} ref={(node) => { tabs.current[index] = node; }} onKeyDown={onKeyDown}
        className="product-image-tab" key={group.color} onClick={() => setActiveColor(group.color)}>
        <span style={{ backgroundColor: colorSwatch(group.color).background }} aria-hidden="true"/>{group.color}
        <small>{group.images.length}</small>
      </button>;
      })}
    </div>
    <div role="tabpanel" id={`product-images-panel-${Math.max(0, groups.findIndex((group) => group.color === selectedColor))}`}
      aria-labelledby={`product-images-tab-${Math.max(0, groups.findIndex((group) => group.color === selectedColor))}`}>
    <div className="product-image-group-toolbar">
      <div><strong>{active?.color}</strong><span>{count} images sur {MAX_IMAGES_PER_COLOR}</span></div>
      <input ref={input} className="visually-hidden" aria-label={`Téléverser des images pour ${active?.color}`}
        type="file" accept="image/jpeg,image/png,image/webp" multiple
        disabled={props.disabled || props.uploading || count >= MAX_IMAGES_PER_COLOR}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])].slice(0, MAX_IMAGES_PER_COLOR - count);
          event.target.value = "";
          if (files.length && active) props.onUploadFiles(active.color, files);
        }}/>
      <button className="admin-outline-button" type="button" disabled={props.disabled || props.uploading || count >= MAX_IMAGES_PER_COLOR}
        onClick={() => input.current?.click()}>
        {props.uploading ? <LoadingLabel>Import en cours…</LoadingLabel> : <>＋ Ajouter des images</>}
      </button>
    </div>
    <p className="admin-inline-note">JPEG, PNG ou WebP · 5 Mio maximum.</p>
    {!active || count === 0 ? <div className="admin-image-empty"><span aria-hidden="true">◇</span><strong>Aucune image pour {active?.color}</strong><p>Importez un premier visuel pour cette couleur.</p></div> :
      <div className="admin-image-gallery" role="region" aria-label="Images du produit">
        {active.images.map((image, groupIndex) => {
          const globalIndex = props.images.indexOf(image);
          const altErrorId = `product-image-${globalIndex}-alt-error`;
          return <article className="admin-image-card" key={image.id ?? image.url}>
            <a className="admin-image-preview" href={image.url} target="_blank" rel="noreferrer" aria-label={`Ouvrir l’image ${groupIndex + 1}`}>
              <Image src={image.url} alt={image.alt} width={420} height={320}/>{groupIndex === 0 && <span>Principale</span>}
            </a>
            <div className="admin-image-card-body">
              <label>Texte alternatif<input disabled={props.disabled || props.uploading} required minLength={2} maxLength={160}
                aria-invalid={!!props.errors[`images.${globalIndex}.alt`]}
                aria-describedby={props.errors[`images.${globalIndex}.alt`] ? altErrorId : undefined}
                value={image.alt} onChange={(event) => props.onChangeAlt(image, event.target.value)}/></label>
              {["alt", "url", "color", "position", "id"].map((field) =>
                <FieldErrors key={field} id={field === "alt" ? altErrorId : undefined} values={props.errors[`images.${globalIndex}.${field}`]}/>)}
              <div className="admin-image-actions">
                <button className="admin-icon-button" aria-label={`Déplacer l’image ${groupIndex + 1} vers le haut`} disabled={props.disabled || props.uploading || groupIndex === 0} type="button" onClick={() => props.onMoveWithinColor(active.color, groupIndex, -1)}><Arrow/></button>
                <button className="admin-icon-button" aria-label={`Déplacer l’image ${groupIndex + 1} vers le bas`} disabled={props.disabled || props.uploading || groupIndex === count - 1} type="button" onClick={() => props.onMoveWithinColor(active.color, groupIndex, 1)}><Arrow down/></button>
                <button className="admin-icon-button is-danger" aria-label={`Supprimer l’image ${groupIndex + 1}`} disabled={props.disabled || props.uploading} type="button" onClick={() => props.onDelete(image)}>×</button>
              </div>
            </div>
          </article>;
        })}
      </div>}
    </div>
  </div>;
}
