"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LoginFormProps = {
  destination: "/admin" | "/admin/commandes";
};

export function LoginForm({ destination }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");

    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      redirect: false,
      email: data.get("email"),
      password: data.get("password"),
    });

    if (!result?.ok) {
      setError("Identifiants invalides.");
      setPending(false);
      return;
    }

    router.replace(destination);
    router.refresh();
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
