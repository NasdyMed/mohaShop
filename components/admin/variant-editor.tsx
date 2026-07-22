"use client";
export type EditableVariant = { id?: string; sku: string; size: string; color: string; stock: number; historical?: boolean };
type Errors = Record<string, string[]>;
const FieldError = ({ errors, id }: { errors?: string[]; id?: string }) => errors?.map((error, index) => <p className="field-error" id={index === 0 ? id : undefined} key={error}>{error}</p>);

export function VariantEditor({ value, onChange, disabled, errors = {} }: { value: EditableVariant[]; onChange: (value: EditableVariant[]) => void; disabled: boolean; errors?: Errors }) {
  const update = (index: number, patch: Partial<EditableVariant>) => onChange(value.map((variant, current) => current === index ? { ...variant, ...patch } : variant));
  return <fieldset className="variant-editor" disabled={disabled}>
    <legend>Déclinaisons</legend>
    <FieldError errors={errors.variants}/>
    <p>Une déclinaison supprimée peut être conservée à stock zéro si elle figure dans une commande passée.</p>
    {value.map((variant, index) => <div className="variant-row" key={variant.id ?? index}>
      <label>Pointure<input required maxLength={20} aria-invalid={!!errors[`variants.${index}.size`]} aria-describedby={errors[`variants.${index}.size`] ? `variant-${index}-size-error` : undefined} value={variant.size} onChange={(event) => update(index, { size: event.target.value })}/></label><FieldError id={`variant-${index}-size-error`} errors={errors[`variants.${index}.size`]}/>
      <label>Couleur<input required maxLength={60} aria-invalid={!!errors[`variants.${index}.color`]} aria-describedby={errors[`variants.${index}.color`] ? `variant-${index}-color-error` : undefined} value={variant.color} onChange={(event) => update(index, { color: event.target.value })}/></label><FieldError id={`variant-${index}-color-error`} errors={errors[`variants.${index}.color`]}/>
      <label>SKU<input required maxLength={64} aria-invalid={!!errors[`variants.${index}.sku`]} aria-describedby={errors[`variants.${index}.sku`] ? `variant-${index}-sku-error` : undefined} value={variant.sku} onChange={(event) => update(index, { sku: event.target.value.toUpperCase() })}/></label><FieldError id={`variant-${index}-sku-error`} errors={errors[`variants.${index}.sku`]}/>
      <label>Stock<input required type="number" min={0} max={1_000_000} aria-invalid={!!errors[`variants.${index}.stock`]} aria-describedby={errors[`variants.${index}.stock`] ? `variant-${index}-stock-error` : undefined} value={variant.stock} onChange={(event) => update(index, { stock: Number(event.target.value) })}/></label><FieldError id={`variant-${index}-stock-error`} errors={errors[`variants.${index}.stock`]}/>
      <FieldError errors={errors[`variants.${index}.id`]}/><FieldError errors={errors[`variants.${index}`]}/>
      <button type="button" onClick={() => onChange(value.filter((_, current) => current !== index))}>Retirer</button>
      {variant.historical && <small>Historique : le retrait désactivera cette déclinaison sans effacer les commandes.</small>}
    </div>)}
    <button type="button" onClick={() => onChange([...value, { sku: "", size: "", color: "", stock: 0 }])}>Ajouter une déclinaison</button>
  </fieldset>;
}
