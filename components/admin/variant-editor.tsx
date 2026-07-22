"use client";
export type EditableVariant = { id?: string; sku: string; size: string; color: string; stock: number; historical?: boolean };
type Errors = Record<string, string[]>;
const FieldError = ({ errors }: { errors?: string[] }) => errors?.map((error) => <p className="field-error" key={error}>{error}</p>);

export function VariantEditor({ value, onChange, disabled, errors = {} }: { value: EditableVariant[]; onChange: (value: EditableVariant[]) => void; disabled: boolean; errors?: Errors }) {
  const update = (index: number, patch: Partial<EditableVariant>) => onChange(value.map((variant, current) => current === index ? { ...variant, ...patch } : variant));
  return <fieldset className="variant-editor" disabled={disabled}>
    <legend>Déclinaisons</legend>
    <FieldError errors={errors.variants}/>
    <p>Une déclinaison supprimée peut être conservée à stock zéro si elle figure dans une commande passée.</p>
    {value.map((variant, index) => <div className="variant-row" key={variant.id ?? index}>
      <label>Pointure<input required maxLength={20} value={variant.size} onChange={(event) => update(index, { size: event.target.value })}/></label><FieldError errors={errors[`variants.${index}.size`]}/>
      <label>Couleur<input required maxLength={60} value={variant.color} onChange={(event) => update(index, { color: event.target.value })}/></label><FieldError errors={errors[`variants.${index}.color`]}/>
      <label>SKU<input required maxLength={64} value={variant.sku} onChange={(event) => update(index, { sku: event.target.value.toUpperCase() })}/></label><FieldError errors={errors[`variants.${index}.sku`]}/>
      <label>Stock<input required type="number" min={0} max={1_000_000} value={variant.stock} onChange={(event) => update(index, { stock: Number(event.target.value) })}/></label><FieldError errors={errors[`variants.${index}.stock`]}/>
      <FieldError errors={errors[`variants.${index}.id`]}/><FieldError errors={errors[`variants.${index}`]}/>
      <button type="button" onClick={() => onChange(value.filter((_, current) => current !== index))}>Retirer</button>
      {variant.historical && <small>Historique : le retrait désactivera cette déclinaison sans effacer les commandes.</small>}
    </div>)}
    <button type="button" onClick={() => onChange([...value, { sku: "", size: "", color: "", stock: 0 }])}>Ajouter une déclinaison</button>
  </fieldset>;
}
