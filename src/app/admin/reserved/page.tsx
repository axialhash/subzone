import { requireAdmin } from '@/lib/auth';
import { Navbar } from '@/components/navbar';
import { AdminNav } from '@/components/admin-nav';
import { ReservedListManager } from '@/components/reserved-list-manager';
import { getReservedList } from '@/lib/actions';

export const metadata = { title: 'Reserved Names' };

export default async function ReservedPage() {
  const user = await requireAdmin();
  const reserved = await getReservedList();

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-5xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Reserved Names</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Subdomains that cannot be claimed by users
          </p>
        </div>
        <AdminNav />
        <ReservedListManager items={reserved} />
      </main>
    </>
  );
}
