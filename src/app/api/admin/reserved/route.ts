import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { name, action } = await req.json();
    const normalized = name.trim().toLowerCase();

    if (action === 'add') {
      await prisma.reservedSubdomain.upsert({
        where: { name: normalized },
        update: {},
        create: { name: normalized, kind: 'admin' },
      });
    } else if (action === 'remove') {
      await prisma.reservedSubdomain.deleteMany({ where: { name: normalized } });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
