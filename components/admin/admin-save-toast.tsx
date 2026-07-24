"use client";

import { useEffect, useState } from "react";

export function AdminSaveToast() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 4500);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <aside className="admin-save-toast" role="status" aria-live="polite">
      <span className="admin-save-toast-icon" aria-hidden="true">✓</span>
      <div>
        <strong>Modification enregistrée</strong>
        <p>Produit enregistré avec succès.</p>
      </div>
      <button type="button" aria-label="Fermer la notification" onClick={() => setVisible(false)}>×</button>
    </aside>
  );
}
