"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button className="text-button" type="button" onClick={() => signOut({ callbackUrl: "/admin/connexion" })}>
      Se déconnecter
    </button>
  );
}
