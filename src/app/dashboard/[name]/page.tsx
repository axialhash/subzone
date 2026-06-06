import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { getRecordByName } from '@/lib/actions';
import { Navbar } from '@/components/navbar';
import { RecordEditor } from '@/components/record-editor';
import { ROOT_DOMAIN } from '@/lib/config';

export const metadata = { title: 'Edit Subdomain' };

export default async function EditSubdomainPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const user = await requireAuth();
  const record = await getRecordByName(name, user.id);
  if (!record) notFound();

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-3xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{name}.{ROOT_DOMAIN}</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage DNS records for this subdomain</p>
        </div>
        <RecordEditor record={record} />
      </main>
    </>
  );
}
