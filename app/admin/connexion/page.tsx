import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/options";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect("/admin");

  const requested = (await searchParams).callbackUrl;
  const destination = requested === "/admin/commandes" ? "/admin/commandes" : "/admin";

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <p className="eyebrow">Espace réservé</p>
        <h1>Administration</h1>
        <p className="admin-login-intro">Connectez-vous pour gérer la boutique.</p>
        <LoginForm destination={destination} />
      </section>
    </main>
  );
}
