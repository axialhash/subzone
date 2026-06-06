/**
 * NextAuth v5 configuration for subzone.
 *
 * GitHub OAuth only. No magic links.
 */

import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { shouldBeAdmin } from "@/lib/admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "user" | "admin";
      isAdmin: boolean;
      githubLogin?: string | null;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: { params: { scope: "read:user user:email" } },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "github" || !user.email || !profile) return false;
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "github" && profile) {
        const p = profile as Record<string, unknown>;
        const dbUser = await prisma.user.upsert({
          where: { email: token.email! },
          update: {
            githubId: p.id != null ? String(p.id) : null,
            githubLogin: typeof p.login === "string" ? p.login : null,
            githubCreatedAt: typeof p.created_at === "string" ? new Date(p.created_at) : new Date(),
            githubAvatarUrl: typeof p.avatar_url === "string" ? p.avatar_url : null,
            githubBio: typeof p.bio === "string" ? p.bio : null,
            githubLocation: typeof p.location === "string" ? p.location : null,
            githubEmailVerified: p.email_verified === true,
            lastSyncedAt: new Date(),
          },
          create: {
            email: token.email!,
            githubId: p.id != null ? String(p.id) : null,
            githubLogin: typeof p.login === "string" ? p.login : null,
            githubCreatedAt: typeof p.created_at === "string" ? new Date(p.created_at) : new Date(),
            githubAvatarUrl: typeof p.avatar_url === "string" ? p.avatar_url : null,
            githubBio: typeof p.bio === "string" ? p.bio : null,
            githubLocation: typeof p.location === "string" ? p.location : null,
            githubEmailVerified: p.email_verified === true,
            lastSyncedAt: new Date(),
            isAdmin: await shouldBeAdmin(token.email!),
          },
        });
        token.isAdmin = dbUser.isAdmin;
        token.role = dbUser.isAdmin ? "admin" : "user";
      }
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { isAdmin: true, role: true },
        });
        token.isAdmin = dbUser?.isAdmin ?? false;
        token.role = dbUser?.role ?? "user";
      }
      return token;
    },
    async session({ session, user, token }) {
      if (session.user) {
        const u = (user ?? {}) as { isAdmin?: boolean; role?: string };
        session.user.isAdmin = u.isAdmin === true;
        session.user.role = (u.role === "admin" ? "admin" : "user") as "user" | "admin";
        if (!u.isAdmin && token) {
          const t = token as Record<string, unknown>;
          session.user.isAdmin = t.isAdmin === true;
          if (t.role === "admin") session.user.role = "admin";
        }
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (!user?.email || account?.provider !== "github" || !profile) return;
      const email = user.email.toLowerCase();

      // Orphan transfer: GitHub user takes ownership of Resend-created subdomains
      try {
        const orphan = await prisma.user.findFirst({ where: { email, githubId: null } });
        if (orphan && orphan.id !== user.id) {
          await prisma.subdomain.updateMany({ where: { userId: orphan.id }, data: { userId: user.id } });
          await prisma.session.deleteMany({ where: { userId: orphan.id } });
          await prisma.account.deleteMany({ where: { userId: orphan.id } });
          await prisma.user.delete({ where: { id: orphan.id } });
        }
      } catch (e) {
        console.error("[auth] orphan transfer failed:", e);
      }

      // Save GitHub profile + auto-promote admin
      try {
        const p = profile as Record<string, unknown>;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            githubId: p.id != null ? String(p.id) : null,
            githubLogin: typeof p.login === "string" ? p.login : null,
            githubCreatedAt: typeof p.created_at === "string" ? new Date(p.created_at) : new Date(),
            githubAvatarUrl: typeof p.avatar_url === "string" ? p.avatar_url : null,
            githubBio: typeof p.bio === "string" ? p.bio : null,
            githubLocation: typeof p.location === "string" ? p.location : null,
            githubEmailVerified: p.email_verified === true,
            lastSyncedAt: new Date(),
            ...(await shouldBeAdmin(email) ? { isAdmin: true, role: "admin" as const } : {}),
          },
        });
      } catch (e) {
        console.error("[auth] GitHub profile save failed:", e);
      }
    },
  },
});

// ── Convenience exports ─────────────────────────────────────────

export async function getProviders() {
  return { github: { id: "github", name: "GitHub" } };
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (!user.isAdmin) throw new Error("Forbidden");
  return user;
}
