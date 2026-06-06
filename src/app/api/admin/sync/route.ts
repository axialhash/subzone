import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { syncFromCloudflare } from '@/lib/actions';

export async function POST() {
  await requireAdmin();
  const result = await syncFromCloudflare();
  return NextResponse.json(result);
}
