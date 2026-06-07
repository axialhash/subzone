import { requireAdmin } from '@/lib/auth';
import { Navbar } from '@/components/navbar';
import { AdminNav } from '@/components/admin-nav';
import { AdminOverview } from '@/components/admin-overview';

export const metadata = { title: 'Admin — Overview' };

export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-5xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Control Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform overview and quick stats
          </p>
        </div>
        <AdminNav />
        <AdminOverview />
      </main>
    </>
  );
}
