/**
 * Eligibility logic for subdomain claims.
 *
 * Determines how many subdomains a user can claim based on their
 * GitHub account age and email verification status. Fully
 * configurable via the TIER_CONFIG object in config.ts.
 */

import { prisma } from "@/lib/prisma";
import { TIER_CONFIG } from "@/lib/config";

export type Tier = 0 | 1 | 2;

/**
 * Determines the claim tier for a user based on their GitHub account age
 * and email verification status.
 *
 * Default tier ladder (configurable in config.ts):
 *   Tier 0: < 30 days old OR email not verified → 0 claims (browse only)
 *   Tier 1: 30 days – 6 months → 1 subdomain
 *   Tier 2: 6+ months → 2 subdomains (matches existing cap)
 */
export async function claimTierFor(userId: string): Promise<Tier> {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { githubCreatedAt: true, githubEmailVerified: true },
  });
  if (!u.githubCreatedAt || !u.githubEmailVerified) return 0;
  const ageMs = Date.now() - u.githubCreatedAt.getTime();
  const days = ageMs / (1000 * 60 * 60 * 24);

  // Walk tiers from highest to lowest, find first match
  const tiers = Object.entries(TIER_CONFIG)
    .map(([k, v]) => ({ tier: Number(k) as Tier, ...v }))
    .sort((a, b) => b.minDays - a.minDays);

  for (const t of tiers) {
    if (days >= t.minDays) return t.tier;
  }
  return 0;
}

export const TIER_LIMITS: Record<Tier, number> = {
  0: TIER_CONFIG[0].limit,
  1: TIER_CONFIG[1].limit,
  2: TIER_CONFIG[2].limit,
};

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

  // Custom limit override (set by admin)
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

  // Standard tier-based limits
  const tier = await claimTierFor(userId);
  const limit = TIER_LIMITS[tier];

  // Tier 0: not eligible yet
  if (limit === 0) {
    let reason: string;
    if (!u.githubEmailVerified) {
      reason = "You need to verify your GitHub email to claim a subdomain. Go to GitHub Settings → Emails → Verify your primary email, then sign in again.";
    } else if (!u.githubCreatedAt) {
      reason = "Your GitHub account age couldn't be determined. Please sign out and sign back in with GitHub.";
    } else {
      const daysOld = Math.floor(
        (Date.now() - u.githubCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const minDays = TIER_CONFIG[1]?.minDays ?? 30;
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
      const nextTier = TIER_CONFIG[2];
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
