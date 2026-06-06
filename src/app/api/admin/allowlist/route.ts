import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { value, action } = await req.json();
    const normalized = value.trim().toLowerCase();

    if (action === 'add') {
      await prisma.adminAllowlist.upsert({
        where: { email: normalized },
        update: {},
        create: { email: normalized },
      });
    } else if (action === 'remove') {
      await prisma.adminAllowlist.deleteMany({ where: { email: normalized } });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
