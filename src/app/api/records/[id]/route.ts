import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { addDnsRecordAction, removeDnsRecord, deleteRecord } from '@/lib/actions';

const DnsRecordSchema = z.object({
  type: z.enum(['A', 'CNAME', 'TXT']),
  name: z.string().min(1),
  content: z.string().min(1),
  proxied: z.boolean().optional(),
});

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await deleteRecord(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const parsed = DnsRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid DNS record data' }, { status: 400 });
    }
    await addDnsRecordAction(id, user.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    if (!body.recordId || typeof body.recordId !== 'string') {
      return NextResponse.json({ error: 'Missing recordId' }, { status: 400 });
    }
    await removeDnsRecord(id, user.id, body.recordId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
