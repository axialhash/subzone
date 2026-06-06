import { NextResponse } from 'next/server';
import { z } from 'zod';
import { claimSubdomain } from '@/lib/actions';

const ClaimSchema = z.object({
  name: z.string().min(3).max(24).regex(/^[a-z0-9-]+$/),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid subdomain format' }, { status: 400 });
  }
  try {
    const result = await claimSubdomain(parsed.data.name);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Claim failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
