/**
 * Admin authority resolution. Decides whether a given email should have
 * the admin role, and exposes utilities for managing the underlying
 * allowlist + reservation tables.
 *
 * Three sources of admin truth, checked in order:
 *   1. ADMIN_EMAIL_DOMAINS env var — comma-separated list of email
 *      domains (e.g. "example.com"). Any email ending with @<domain>
 *      is auto-admin.
 *   2. BOOTSTRAP_ADMIN_EMAILS env var — comma-separated list of exact
 *      emails granted admin on every sign-in. Intended as a one-time
 *      bootstrap for the founder before any domain-admins exist.
 *   3. AdminAllowlist DB table — explicit per-email allowlist, managed
 *      from /admin/allowlist. This is the "long-term" source.
 *
 * On every successful sign-in, auth.ts events.signIn calls
 * shouldBeAdmin(). If true, the user's role is bumped to "admin". If
 * false, role is left alone (we never auto-demote on sign-in; admin
 * removal is an explicit action).
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { adminEmailDomains, bootstrapAdminEmails } from "@/lib/config";

export async function shouldBeAdmin(email: string): Promise<boolean> {
  const lower = email.toLowerCase();
  if (bootstrapAdminEmails().includes(lower)) return true;
  for (const domain of adminEmailDomains()) {
    if (lower.endsWith("@" + domain)) return true;
  }
  const allowed = await prisma.adminAllowlist.findUnique({
    where: { email: lower },
  });
  return !!allowed;
}

/**
 * Returns true if the name is reserved (DB or static list).
 * Used by the claim flow and the availability check endpoint.
 */
export async function isNameReserved(name: string): Promise<boolean> {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;
  const dbReserved = await prisma.reservedSubdomain.findUnique({
    where: { name: normalized },
  });
  return !!dbReserved;
}
