/**
 * Eligibility logic for subdomain claims.
 *
 * Determines how many subdomains a user can claim based on their
 * GitHub account age, email verification status, and platform settings.
 *
 * Priority:
 *   1. Admin → unlimited
 *   2. Per-user subdomainLimit override (set by admin in dashboard)
 *   3. Platform-wide tier config (set by admin in /admin/settings)
 *   4. Hardcoded defaults in settings.ts
 */

import { prisma } from "@/lib/prisma";
import { getPlatformConfig } from "@/lib/settings";

export type Tier = 0 | 1 | 2;

/**
 * Determines the claim tier for a user based on their GitHub account age
 * and email verification status.
 */
export async function claimTierFor(userId: string): Promise<Tier> {
  const config = await getPlatformConfig();
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { githubCreatedAt: true, githubEmailVerified: true },
  });
  if (!u.githubCreatedAt || !u.githubEmailVerified) return 0;
  const ageMs = Date.now() - u.githubCreatedAt.getTime();
  const days = ageMs / (1000 * 60 * 60 * 24);

  // Walk tiers from highest to lowest, find first match
  const tiers = Object.entries(config.tiers)
    .map(([k, v]) => ({ tier: Number(k) as Tier, ...v }))
    .sort((a, b) => b.minDays - a.minDays);

  for (const t of tiers) {
    if (days >= t.minDays) return t.tier;
  }
  return 0;
}

export async function getTierLimits(): Promise<Record<Tier, number>> {
  const config = await getPlatformConfig();
  return {
    0: config.tiers[0]?.limit ?? 0,
    1: config.tiers[1]?.limit ?? 1,
    2: config.tiers[2]?.limit ?? 2,
  };
}

/**
 * Checks whether a user is eligible to claim a subdomain.
 * Returns { ok: true } if they can claim, or { ok: false, reason } with
 * a user-facing message explaining why they can't.
 */
export async function canClaim(userId: string): Promise<{
  ok: boolean;
  reason?: string;
  current: number;
  limit: number;
}> {
  const config = await getPlatformConfig();
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      githubCreatedAt: true,
      githubEmailVerified: true,
      role: true,
      subdomainLimit: true,
    },
  });

  // Admins: unlimited
  if (u.role === "admin") {
    const current = await prisma.subdomain.count({
      where: { userId, status: "active" },
    });
    return { ok: true, current, limit: -1 };
  }

  // Per-user subdomainLimit override (set by admin)
  if (u.subdomainLimit !== null) {
    const current = await prisma.subdomain.count({
      where: { userId, status: "active" },
    });
    if (u.subdomainLimit === -1) {
      return { ok: true, current, limit: -1 };
    }
    if (current >= u.subdomainLimit) {
      return {
        ok: false,
        reason: `You've reached your limit of ${u.subdomainLimit} subdomain${u.subdomainLimit === 1 ? "" : "s"}.`,
        current,
        limit: u.subdomainLimit,
      };
    }
    return { ok: true, current, limit: u.subdomainLimit };
  }

  // Global subdomain limit (platform-wide cap)
  if (config.globalSubdomainLimit !== -1) {
    const current = await prisma.subdomain.count({
      where: { userId, status: "active" },
    });
    // Use the lower of tier limit and global limit
    const tier = await claimTierFor(userId);
    const tierLimits = await getTierLimits();
    const tierLimit = tierLimits[tier];
    const effectiveLimit = Math.min(tierLimit, config.globalSubdomainLimit);

    if (effectiveLimit === 0) {
      // Fall through to tier-based messaging below
    } else if (current >= effectiveLimit) {
      return {
        ok: false,
        reason: `You've reached the platform limit of ${effectiveLimit} subdomain${effectiveLimit === 1 ? "" : "s"}.`,
        current,
        limit: effectiveLimit,
      };
    } else {
      return { ok: true, current, limit: effectiveLimit };
    }
  }

  // Standard tier-based limits
  const tier = await claimTierFor(userId);
  const tierLimits = await getTierLimits();
  const limit = tierLimits[tier];

  // Tier 0: not eligible yet
  if (limit === 0) {
    let reason: string;
    if (!u.githubEmailVerified) {
      reason =
        "You need to verify your GitHub email to claim a subdomain. Go to GitHub Settings → Emails → Verify your primary email, then sign in again.";
    } else if (!u.githubCreatedAt) {
      reason =
        "Your GitHub account age couldn't be determined. Please sign out and sign back in with GitHub.";
    } else {
      const daysOld = Math.floor(
        (Date.now() - u.githubCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const minDays = config.tiers[1]?.minDays ?? 30;
      const daysNeeded = minDays - daysOld;
      reason = `Your GitHub account is ${daysOld} day${daysOld === 1 ? "" : "s"} old. You need to be at least ${minDays} days old to claim a subdomain — ${daysNeeded} more day${daysNeeded === 1 ? "" : "s"} to go.`;
    }
    return { ok: false, reason, current: 0, limit: 0 };
  }

  const current = await prisma.subdomain.count({
    where: { userId, status: "active" },
  });

  if (current >= limit) {
    let reason: string;
    if (limit === 1) {
      const monthsOld = u.githubCreatedAt
        ? Math.floor(
            (Date.now() - u.githubCreatedAt.getTime()) /
              (1000 * 60 * 60 * 24 * 30)
          )
        : 0;
      const nextTier = config.tiers[2];
      const monthsNeeded = nextTier
        ? Math.floor(nextTier.minDays / 30)
        : 6;
      reason = `You've claimed your 1 allowed subdomain. Your GitHub account is ${monthsOld} month${monthsOld === 1 ? "" : "s"} old — you need ${monthsNeeded} months of GitHub account age to unlock a second subdomain.`;
    } else {
      reason = `You've reached the maximum of ${limit} subdomains. This is the platform limit for all users.`;
    }
    return { ok: false, reason, current, limit };
  }

  return { ok: true, current, limit };
}
