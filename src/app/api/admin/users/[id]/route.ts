/**
 * GET  /api/admin/users/[id] — returns user details
 * PATCH /api/admin/users/[id] — updates user (subdomainLimit, role, isAdmin)
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        subdomainLimit: true,
        githubLogin: true,
        githubAvatarUrl: true,
        createdAt: true,
        _count: { select: { subdomains: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Prevent self-demotion
    const currentUser = await requireAdmin();
    if (currentUser.id === id && body.isAdmin === false) {
      return NextResponse.json(
        { error: "Cannot remove your own admin status" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};

    // subdomainLimit: number or null (null = use tier defaults)
    if ("subdomainLimit" in body) {
      const val = body.subdomainLimit;
      if (val === null || val === -1) {
        data.subdomainLimit = val === -1 ? -1 : null;
      } else if (typeof val === "number" && val >= 0) {
        data.subdomainLimit = val;
      } else {
        return NextResponse.json(
          { error: "Invalid subdomainLimit" },
          { status: 400 }
        );
      }
    }

    // role + isAdmin toggle
    if ("isAdmin" in body) {
      const isAdmin = body.isAdmin === true;
      data.isAdmin = isAdmin;
      data.role = isAdmin ? "admin" : "user";
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        subdomainLimit: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
