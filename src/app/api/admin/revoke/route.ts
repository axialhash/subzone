import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { revokeSubdomain } from '@/lib/actions';

export async function POST(req: Request) {
  await requireAdmin();
  const { name } = await req.json();
  await revokeSubdomain(name);
  return NextResponse.json({ ok: true });
}
