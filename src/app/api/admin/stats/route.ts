/**
 * GET /api/admin/stats — platform stats for the admin overview dashboard
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const [
      totalUsers,
      totalAdmins,
      totalSubdomains,
      activeSubdomains,
      revokedSubdomains,
      totalDnsRecords,
      totalReserved,
      totalAllowlisted,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.subdomain.count(),
      prisma.subdomain.count({ where: { status: "active" } }),
      prisma.subdomain.count({ where: { status: "revoked" } }),
      prisma.dnsRecord.count(),
      prisma.reservedSubdomain.count(),
      prisma.adminAllowlist.count(),
    ]);

    // Recent activity — last 10 subdomains
    const recentSubdomains = await prisma.subdomain.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
      },
    });

    // Users with most subdomains
    const topUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { subdomains: { _count: "desc" } },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        subdomainLimit: true,
        _count: { select: { subdomains: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      stats: {
        totalUsers,
        totalAdmins,
        totalSubdomains,
        activeSubdomains,
        revokedSubdomains,
        totalDnsRecords,
        totalReserved,
        totalAllowlisted,
      },
      recentSubdomains,
      topUsers,
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
