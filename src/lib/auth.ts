import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { verifyUser, findOrCreateOAuthUser } from "@/lib/users";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await verifyUser({
          email: credentials.email,
          password: credentials.password,
        });
        if (!user) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user?.email) {
        // No adapter is configured, so NextAuth won't persist Google users to our
        // own `users` table on its own -- link (or create) the row ourselves and
        // use *our* id, not Google's, as the session identity.
        const dbUser = await findOrCreateOAuthUser({ email: user.email, name: user.name });
        token.id = dbUser.id;
        token.role = dbUser.role;
      } else if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role ?? "user";
      }
      return session;
    }
  }
};
