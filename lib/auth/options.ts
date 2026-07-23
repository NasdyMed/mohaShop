import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "@/lib/db";
import { authorizeAdmin } from "@/lib/auth/authorize";
import { verifyAdminCredentials } from "@/lib/auth/credentials";
import { getAuthRateLimiter } from "@/lib/security/auth-rate-limit";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/admin/connexion",
  },
  providers: [
    CredentialsProvider({
      name: "Administration",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, request) {
        return authorizeAdmin(credentials, request.headers ?? {}, {
          limiter: getAuthRateLimiter(),
          verify(raw) {
            return verifyAdminCredentials(raw, {
              findByEmail(email) {
                return db.admin.findUnique({
                  where: { email },
                  select: { id: true, email: true, passwordHash: true },
                });
              },
            });
          },
        });
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.adminId = user.id;
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.adminId && token.email) {
        session.user.id = token.adminId;
        session.user.email = token.email;
      }
      return session;
    },
  },
};
