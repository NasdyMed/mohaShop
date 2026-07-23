import type { ReactNode } from "react";

export function LoadingLabel({ children }: { children: ReactNode }) {
  return (
    <span className="loading-label" role="status">
      <span className="loading-spinner" data-testid="loading-spinner" aria-hidden="true" />
      {children}
    </span>
  );
}
