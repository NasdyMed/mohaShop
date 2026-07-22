"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

type LoginFormProps = {
  destination: "/admin" | "/admin/commandes";
};

export function LoginForm({ destination }: LoginFormProps) {
  const router = useRouter();
  const submitLocked = useRef(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLocked.current) return;
    submitLocked.current = true;
    setPending(true);
    setError("");

    try {
      const data = new FormData(event.currentTarget);
      const result = await signIn("credentials", {
        redirect: false,
        email: data.get("email"),
        password: data.get("password"),
      });

      if (result?.ok) {
        router.replace(destination);
        router.refresh();
        return;
      }

      submitLocked.current = false;
      setError("Identifiants invalides.");
      setPending(false);
    } catch {
      submitLocked.current = false;
      setError("Identifiants invalides.");
      setPending(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      {error ? <p className="form-error-summary" role="alert">{error}</p> : null}
      <div className="form-field">
        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="form-field">
        <label htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="admin-submit" type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
