/**
 * Central configuration for subzone.
 *
 * GitHub OAuth only. Swap the root domain, change eligibility tiers,
 * tweak reserved names — all in one place.
 *
 * NOTE: Tier config and platform-wide limits now live in PlatformSettings
 * (managed via /admin/settings). The TIER_CONFIG export here is kept for
 * backward compatibility but eligibility.ts now reads from settings.
 */

// ── Root domain ─────────────────────────────────────────────────
export const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "subzone.dev";
export const BRAND_NAME = process.env.BRAND_NAME ?? ROOT_DOMAIN;

// ── Admin ───────────────────────────────────────────────────────
export function adminEmailDomains(): string[] {
  return readList("ADMIN_EMAIL_DOMAINS");
}

export function bootstrapAdminEmails(): string[] {
  return readList("BOOTSTRAP_ADMIN_EMAILS");
}

// ── Eligibility tiers (legacy — prefer getPlatformConfig()) ────
export interface TierConfig {
  minDays: number;
  limit: number;
}

export const TIER_CONFIG: Record<number, TierConfig> = {
  0: { minDays: 0, limit: 0 },
  1: { minDays: 30, limit: 1 },
  2: { minDays: 180, limit: 2 },
};

// ── Subdomain validation ────────────────────────────────────────
export const SUBDOMAIN_MIN_LENGTH = 3;
export const SUBDOMAIN_MAX_LENGTH = 24;
export const SUBDOMAIN_REGEX = /^[a-z0-9-]+$/;

// ── DNS provider ────────────────────────────────────────────────
export const DNS_PROVIDER =
  (process.env.DNS_PROVIDER as "cloudflare") ?? "cloudflare";

export function cloudflareApiToken(): string {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN not configured");
  return token;
}

export function cloudflareZoneId(): string {
  const id = process.env.CLOUDFLARE_ZONE_ID;
  if (!id) throw new Error("CLOUDFLARE_ZONE_ID not configured");
  return id;
}

// ── Helpers ─────────────────────────────────────────────────────

function readList(envName: string): string[] {
  return (process.env[envName] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
