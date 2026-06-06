import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { revokeSubdomain } from '@/lib/actions';

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid name' }, { status: 400 });
    }
    await revokeSubdomain(body.name.trim().toLowerCase());
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
