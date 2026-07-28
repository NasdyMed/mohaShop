"use client";

import { useRef, useState } from "react";

import { ConfirmRemovalDialog } from "@/components/admin/confirm-removal-dialog";
import { colorSwatch, normalizeKnownProductColor, productColorOptions } from "@/lib/catalog/color-swatches";
import {
  buildVariantMatrix,
  productSizes,
  requiresVariantRemovalConfirmation,
  VariantMatrixConflictError,
  variantKey,
  type EditableVariant,
} from "@/lib/catalog/variant-matrix";

export type { EditableVariant } from "@/lib/catalog/variant-matrix";
type Errors = Record<string, string[]>;
type Removal = { kind: "color" | "size"; value: string; trigger: HTMLInputElement };
const FieldError = ({ errors, id }: { errors?: string[]; id?: string }) => errors?.map((error, index) =>
  <p className="field-error" id={index === 0 ? id : undefined} key={`${error}-${index}`}>{error}</p>);

export function VariantEditor({ productSlug, value, onChange, disabled, errors = {}, protectedColors, onConfirmedColorRemoval }: {
  productSlug: string;
  value: EditableVariant[];
  onChange: (value: EditableVariant[]) => void;
  disabled: boolean;
  errors?: Errors;
  protectedColors: ReadonlySet<string>;
  onConfirmedColorRemoval: (color: string) => void;
}) {
  const active = value.filter((variant) => !variant.removed);
  const legacyColors = [...new Set(active.map((variant) => variant.color).filter((color) => !normalizeKnownProductColor(color)))];
  const [selectedColors, setSelectedColors] = useState(() => [...new Set(active.map((variant) => variant.color))]);
  const [selectedSizes, setSelectedSizes] = useState(() => [...new Set(active.map((variant) => variant.size))]);
  const [pending, setPending] = useState<Removal | null>(null);
  const restoreFocus = useRef<HTMLInputElement | null>(null);

  const conflict = (() => {
    try {
      buildVariantMatrix(value, selectedColors, selectedSizes, productSlug);
      return null;
    } catch (error) {
      return error instanceof VariantMatrixConflictError ? error : null;
    }
  })();

  const rebuild = (colors: string[], sizes: string[]) => {
    try {
      const matrix = buildVariantMatrix(value, colors, sizes, productSlug).map((variant) =>
        variant.removed ? { ...variant, removed: false } : variant);
      const removedHistorical = value.filter((variant) => variant.removed && variant.historical &&
        !matrix.some((item) => variantKey(item.color, item.size) === variantKey(variant.color, variant.size)));
      onChange([...matrix, ...removedHistorical]);
      return true;
    } catch (error) {
      if (!(error instanceof VariantMatrixConflictError)) throw error;
      return false;
    }
  };

  const affected = (removal: Removal) => active.filter((variant) =>
    removal.kind === "color" ? variant.color === removal.value : variant.size === removal.value);

  const applyRemoval = (removal: Removal) => {
    const impactedKeys = new Set(affected(removal).map((variant) => variantKey(variant.color, variant.size)));
    const next = value.flatMap((variant) => {
      if (!impactedKeys.has(variantKey(variant.color, variant.size))) return [variant];
      return variant.historical ? [{ ...variant, stock: 0, removed: true }] : [];
    });
    onChange(next);
    if (removal.kind === "color") setSelectedColors((current) => current.filter((item) => item !== removal.value));
    else setSelectedSizes((current) => current.filter((item) => item !== removal.value));
    if (removal.kind === "color" && protectedColors.has(removal.value)) onConfirmedColorRemoval(removal.value);
  };

  const requestRemoval = (removal: Removal) => {
    const needsConfirmation = affected(removal).some(requiresVariantRemovalConfirmation) ||
      (removal.kind === "color" && protectedColors.has(removal.value));
    if (!needsConfirmation) return applyRemoval(removal);
    restoreFocus.current = removal.trigger;
    setPending(removal);
  };

  const cancel = () => {
    setPending(null);
    queueMicrotask(() => restoreFocus.current?.focus());
  };
  const confirm = () => {
    if (!pending) return;
    applyRemoval(pending);
    setPending(null);
    queueMicrotask(() => restoreFocus.current?.focus());
  };

  const toggleColor = (color: string, input: HTMLInputElement) => {
    if (selectedColors.includes(color)) requestRemoval({ kind: "color", value: color, trigger: input });
    else {
      const colors = [...selectedColors, color];
      if (rebuild(colors, selectedSizes)) setSelectedColors(colors);
    }
  };
  const toggleSize = (size: string, input: HTMLInputElement) => {
    if (selectedSizes.includes(size)) requestRemoval({ kind: "size", value: size, trigger: input });
    else {
      const sizes = [...selectedSizes, size];
      if (rebuild(selectedColors, sizes)) setSelectedSizes(sizes);
    }
  };
  const update = (target: EditableVariant, patch: Partial<EditableVariant>) =>
    onChange(value.map((variant) => variant === target ? { ...variant, ...patch } : variant));

  return <fieldset className={`variant-editor variant-matrix-editor${disabled ? " is-disabled" : ""}`} disabled={disabled} aria-busy={disabled}>
    <legend className="visually-hidden">Déclinaisons</legend>
    <FieldError errors={errors.variants}/>
    <div className="admin-section-heading">
      <div><span className="admin-section-index">02</span><h2>Tailles et couleurs</h2></div>
      <p>Sélectionnez les options, puis renseignez le stock de chaque combinaison.</p>
    </div>
    {conflict && <p role="alert" className="form-error-summary">Conflit de variantes existantes : plusieurs lignes utilisent la même couleur et pointure. Aucune donnée n’a été modifiée.</p>}
    <fieldset className="variant-choice-group">
      <legend>Couleurs</legend>
      <div className="variant-color-grid">
        {productColorOptions.map((color) => <label className="variant-matrix-color" key={color}>
          <input type="checkbox" aria-label={color} checked={selectedColors.includes(color)} onChange={(event) => toggleColor(color, event.currentTarget)}/>
          <span className="variant-swatch" style={{ backgroundColor: colorSwatch(color).background }} aria-hidden="true"/>
          <span>{color}</span>
        </label>)}
        {legacyColors.map((color) => <label className="variant-matrix-color is-historical" key={color}>
          <input type="checkbox" aria-label={`${color} (historique)`} checked
            onChange={(event) => requestRemoval({ kind: "color", value: color, trigger: event.currentTarget })}/>
          <span className="variant-swatch" style={{ backgroundColor: colorSwatch(color).background }} aria-hidden="true"/>
          <span>{color} (historique)</span>
        </label>)}
      </div>
    </fieldset>
    <fieldset className="variant-choice-group">
      <legend>Pointures</legend>
      <div className="variant-size-grid">
        {productSizes.map((size) => <label className="variant-matrix-size" key={size}>
          <input type="checkbox" aria-label={`Pointure ${size}`} checked={selectedSizes.includes(size)} onChange={(event) => toggleSize(size, event.currentTarget)}/>
          <span>{size}</span>
        </label>)}
      </div>
    </fieldset>
    {selectedColors.length && selectedSizes.length ? <div className="variant-stock-scroll">
      <table className="variant-stock-table">
        <thead><tr><th>Couleur</th>{selectedSizes.map((size) => <th key={size}>{size}</th>)}</tr></thead>
        <tbody>{selectedColors.map((color) => <tr key={color}><th>{color}</th>{selectedSizes.map((size) => {
          const variant = active.find((item) => variantKey(item.color, item.size) === variantKey(color, size))!;
          const index = value.indexOf(variant);
          const errorId = `variant-${index}-stock-error`;
          const structural = [
            [`variants.${index}`, `variant-${index}-error`],
            [`variants.${index}.id`, `variant-${index}-id-error`],
            [`variants.${index}.size`, `variant-${index}-size-error`],
            [`variants.${index}.color`, `variant-${index}-color-error`],
          ] as const;
          const describedBy = [
            ...structural.filter(([key]) => errors[key]).map(([, id]) => id),
            ...(errors[`variants.${index}.stock`] ? [errorId] : []),
          ].join(" ") || undefined;
          return <td key={size}><input type="number" min={0} max={1_000_000} step={1} aria-label={`Stock ${color}, pointure ${size}`}
            aria-invalid={!!describedBy} aria-describedby={describedBy}
            value={variant.stock} onChange={(event) => update(variant, { stock: Math.max(0, Math.min(1_000_000, Math.trunc(Number(event.target.value)))) })}/>
            {structural.map(([key, id]) => <FieldError key={key} id={id} errors={errors[key]}/>)}
            <FieldError id={errorId} errors={errors[`variants.${index}.stock`]}/></td>;
        })}</tr>)}</tbody>
      </table>
    </div> : <p className="variant-matrix-empty">Choisissez au moins une couleur et une pointure pour créer la matrice de stock.</p>}
    {value.length > 0 && <details className="variant-sku-details">
      <summary>SKU avancés</summary>
      <div>{active.map((variant) => {
        const index = value.indexOf(variant);
        const errorId = `variant-${index}-sku-error`;
        return <label key={variantKey(variant.color, variant.size)}>SKU {variant.color}, pointure {variant.size}
          <input aria-label={`SKU ${variant.color}, pointure ${variant.size}`} maxLength={64} value={variant.sku}
            aria-invalid={!!errors[`variants.${index}.sku`]} aria-describedby={errors[`variants.${index}.sku`] ? errorId : undefined}
            onChange={(event) => update(variant, { sku: event.target.value.toUpperCase() })}/>
          <FieldError id={errorId} errors={errors[`variants.${index}.sku`]}/>
        </label>;
      })}
      {value.filter((variant) => variant.removed && variant.historical).map((variant) =>
        <p className="variant-history" key={variant.id ?? variantKey(variant.color, variant.size)}>
          <strong>Historique désactivée</strong> — {variant.color}, pointure {variant.size} · {variant.sku}
        </p>)}</div>
    </details>}
    {pending && <ConfirmRemovalDialog title="Retirer cette sélection ?"
      description={pending.kind === "color" && protectedColors.has(pending.value)
        ? `Les variantes concernées seront retirées et les images de la couleur ${pending.value} seront retirées du produit. Les variantes liées à des commandes resteront conservées avec un stock nul.`
        : "Les variantes concernées seront retirées. Les variantes liées à des commandes resteront conservées avec un stock nul."}
      onCancel={cancel} onConfirm={confirm}/>}
  </fieldset>;
}
