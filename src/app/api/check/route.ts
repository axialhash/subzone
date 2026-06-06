import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isNameReserved } from '@/lib/admin';
import { validateSubdomainFormat } from '@/lib/validation';

const CheckSchema = z.object({
  name: z.string().min(3).max(24).regex(/^[a-z0-9-]+$/),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = CheckSchema.safeParse({ name: searchParams.get('name') });
  if (!parsed.success) {
    return NextResponse.json({ available: false, reason: 'Invalid format' });
  }

  // Full validation: format, static reserved list, patterns, profanity
  const validation = validateSubdomainFormat(parsed.data.name);
  if (!validation.ok) {
    return NextResponse.json({ available: false, reason: validation.reason });
  }

  // Check reserved names (DB)
  if (await isNameReserved(parsed.data.name)) {
    return NextResponse.json({ available: false, reason: 'Reserved' });
  }

  // Check if already claimed
  const existing = await prisma.subdomain.findUnique({ where: { name: parsed.data.name } });
  if (existing?.status === 'active') {
    return NextResponse.json({ available: false, reason: 'Taken' });
  }

  return NextResponse.json({ available: true });
}
