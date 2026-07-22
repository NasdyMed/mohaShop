import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/options";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) redirect("/admin/connexion");
  return session;
}
