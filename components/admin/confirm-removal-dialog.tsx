"use client";

import { useEffect, useRef } from "react";

export function ConfirmRemovalDialog({ title, description, onCancel, onConfirm }: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      } else if (event.key === "Tab") {
        const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])") ?? [])]
          .filter((control) => !control.hasAttribute("disabled"));
        if (!controls.length) return;
        const first = controls[0];
        const last = controls.at(-1)!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [onCancel]);

  return <div className="variant-dialog-overlay">
    <div ref={dialogRef} className="variant-dialog" role="dialog" aria-modal="true" aria-labelledby="variant-dialog-title" aria-describedby="variant-dialog-description">
      <h2 id="variant-dialog-title">{title}</h2>
      <p id="variant-dialog-description">{description}</p>
      <div>
        <button ref={cancelRef} type="button" className="admin-outline-button" onClick={onCancel}>Annuler</button>
        <button type="button" className="admin-submit" onClick={onConfirm}>Confirmer le retrait</button>
      </div>
    </div>
  </div>;
}
