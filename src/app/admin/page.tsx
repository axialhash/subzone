import { requireAdmin } from '@/lib/auth';
import { Navbar } from '@/components/navbar';
import { AdminNav } from '@/components/admin-nav';
import { getAllRecords } from '@/lib/actions';

export const metadata = { title: 'Admin' };

export default async function AdminPage() {
  const user = await requireAdmin();
  const allRecords = await getAllRecords();

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-5xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allRecords.length} total subdomains provisioned
          </p>
        </div>
        <AdminNav />
      </main>
    </>
  );
}
