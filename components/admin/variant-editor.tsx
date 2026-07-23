"use client";

import { colorSwatch, productColorOptions } from "@/lib/catalog/color-swatches";

export type EditableVariant = { id?: string; sku: string; size: string; color: string; stock: number; historical?: boolean };
type Errors = Record<string, string[]>;
const FieldError = ({ errors, id }: { errors?: string[]; id?: string }) => errors?.map((error, index) => <p className="field-error" id={index === 0 ? id : undefined} key={error}>{error}</p>);

export function VariantEditor({ value, onChange, disabled, errors = {} }: { value: EditableVariant[]; onChange: (value: EditableVariant[]) => void; disabled: boolean; errors?: Errors }) {
  const update = (index: number, patch: Partial<EditableVariant>) => onChange(value.map((variant, current) => current === index ? { ...variant, ...patch } : variant));
  return <fieldset className="variant-editor" disabled={disabled}>
    <legend>Déclinaisons</legend>
    <FieldError errors={errors.variants}/>
    <div className="admin-section-heading">
      <div><span className="admin-section-index">03</span><h2>Tailles et couleurs</h2></div>
      <p>Créez une ligne par combinaison disponible.</p>
    </div>
    {value.map((variant, index) => <div className="variant-row" key={variant.id ?? index}>
      <div className="variant-row-title"><span>Déclinaison {String(index + 1).padStart(2, "0")}</span><button className="admin-icon-text-button is-danger" type="button" onClick={() => onChange(value.filter((_, current) => current !== index))}><span aria-hidden="true">×</span> Supprimer</button></div>
      <div className="variant-fields">
        <label>Pointure<input required maxLength={20} aria-invalid={!!errors[`variants.${index}.size`]} aria-describedby={errors[`variants.${index}.size`] ? `variant-${index}-size-error` : undefined} value={variant.size} onChange={(event) => update(index, { size: event.target.value })}/></label><FieldError id={`variant-${index}-size-error`} errors={errors[`variants.${index}.size`]}/>
        <label>SKU<input required maxLength={64} aria-invalid={!!errors[`variants.${index}.sku`]} aria-describedby={errors[`variants.${index}.sku`] ? `variant-${index}-sku-error` : undefined} value={variant.sku} onChange={(event) => update(index, { sku: event.target.value.toUpperCase() })}/></label><FieldError id={`variant-${index}-sku-error`} errors={errors[`variants.${index}.sku`]}/>
        <label>Stock<input required type="number" min={0} max={1_000_000} aria-invalid={!!errors[`variants.${index}.stock`]} aria-describedby={errors[`variants.${index}.stock`] ? `variant-${index}-stock-error` : undefined} value={variant.stock} onChange={(event) => update(index, { stock: Number(event.target.value) })}/></label><FieldError id={`variant-${index}-stock-error`} errors={errors[`variants.${index}.stock`]}/>
      </div>
      <fieldset className="admin-color-picker" aria-describedby={errors[`variants.${index}.color`] ? `variant-${index}-color-error` : undefined}>
        <legend>Couleur <strong>{variant.color || "Noir"}</strong></legend>
        <div className="admin-color-options">
          {productColorOptions.map((color) => <label className="admin-color-option" key={color} title={color}>
            <input type="radio" name={`variant-color-${index}`} value={color} aria-label={color} checked={(variant.color || "Noir") === color} onChange={() => update(index, { color })}/>
            <span style={{ backgroundColor: colorSwatch(color).background }} aria-hidden="true"/>
          </label>)}
        </div>
      </fieldset>
      <FieldError id={`variant-${index}-color-error`} errors={errors[`variants.${index}.color`]}/>
      <FieldError errors={errors[`variants.${index}.id`]}/><FieldError errors={errors[`variants.${index}`]}/>
      {variant.historical && <small>Historique : le retrait désactivera cette déclinaison sans effacer les commandes.</small>}
    </div>)}
    <button className="admin-outline-button" type="button" onClick={() => onChange([...value, { sku: "", size: "", color: "Noir", stock: 0 }])}><span aria-hidden="true">＋</span> Ajouter une déclinaison</button>
  </fieldset>;
}
