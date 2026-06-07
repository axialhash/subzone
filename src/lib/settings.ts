/**
 * Platform settings — key-value store backed by the PlatformSetting table.
 *
 * Every getter has an env-var / hardcoded fallback so the platform works
 * out of the box before any admin visits the settings page.
 *
 * Tier config keys:
 *   tier_0_min_days, tier_0_limit
 *   tier_1_min_days, tier_1_limit
 *   tier_2_min_days, tier_2_limit
 *
 * Other keys:
 *   global_subdomain_limit  — per-user default cap (-1 = unlimited)
 *   platform_name           — displayed in the UI
 *   registrations_open      — "true" / "false"
 */

import "server-only";
import { prisma } from "@/lib/prisma";

// ── Low-level helpers ─────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function deleteSetting(key: string): Promise<void> {
  await prisma.platformSetting.delete({ where: { key } }).catch(() => {});
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.platformSetting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ── Typed getters with defaults ───────────────────────────────

export interface TierConfig {
  minDays: number;
  limit: number;
}

export interface PlatformConfig {
  tiers: Record<number, TierConfig>;
  globalSubdomainLimit: number; // -1 = unlimited
  platformName: string;
  registrationsOpen: boolean;
}

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const all = await getAllSettings();

  const tiers: Record<number, TierConfig> = {};
  for (const tier of [0, 1, 2]) {
    tiers[tier] = {
      minDays: num(all[`tier_${tier}_min_days`], tierDefaults[tier].minDays),
      limit: num(all[`tier_${tier}_limit`], tierDefaults[tier].limit),
    };
  }

  return {
    tiers,
    globalSubdomainLimit: num(
      all["global_subdomain_limit"],
      defaults.globalSubdomainLimit
    ),
    platformName: all["platform_name"] ?? defaults.platformName,
    registrationsOpen:
      (all["registrations_open"] ?? "true") === "true",
  };
}

/** Apply a batch of settings from the admin form. */
export async function updatePlatformConfig(
  data: Record<string, string>
): Promise<void> {
  const allowed = new Set([
    "tier_0_min_days",
    "tier_0_limit",
    "tier_1_min_days",
    "tier_1_limit",
    "tier_2_min_days",
    "tier_2_limit",
    "global_subdomain_limit",
    "platform_name",
    "registrations_open",
  ]);
  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key)) {
      await setSetting(key, value);
    }
  }
}

// ── Defaults ──────────────────────────────────────────────────

const tierDefaults: Record<number, TierConfig> = {
  0: { minDays: 0, limit: 0 },
  1: { minDays: 30, limit: 1 },
  2: { minDays: 180, limit: 2 },
};

const defaults = {
  globalSubdomainLimit: -1, // unlimited by default
  platformName: "subzone",
  registrationsOpen: true,
};

function num(v: string | null | undefined, fallback: number): number {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
