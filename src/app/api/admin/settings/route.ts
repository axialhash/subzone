/**
 * GET  /api/admin/settings — returns all platform settings
 * POST /api/admin/settings — updates platform settings (body: { key: value })
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getAllSettings,
  updatePlatformConfig,
} from "@/lib/settings";

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getAllSettings();
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    await updatePlatformConfig(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
