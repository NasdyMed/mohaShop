"use client";

import { useEffect, useRef } from "react";

export function ConfirmRemovalDialog({ title, description, onCancel, onConfirm }: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [onCancel]);

  return <div className="variant-dialog-overlay">
    <div className="variant-dialog" role="dialog" aria-modal="true" aria-labelledby="variant-dialog-title" aria-describedby="variant-dialog-description">
      <h2 id="variant-dialog-title">{title}</h2>
      <p id="variant-dialog-description">{description}</p>
      <div>
        <button ref={cancelRef} type="button" className="admin-outline-button" onClick={onCancel}>Annuler</button>
        <button type="button" className="admin-submit" onClick={onConfirm}>Confirmer le retrait</button>
      </div>
    </div>
  </div>;
}
