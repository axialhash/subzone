import { requireAdmin } from '@/lib/auth';
import { Navbar } from '@/components/navbar';
import { AdminNav } from '@/components/admin-nav';
import { AllowlistManager } from '@/components/allowlist-manager';
import { getAllowlist } from '@/lib/actions';

export const metadata = { title: 'Allowlist' };

export default async function AllowlistPage() {
  const user = await requireAdmin();
  const allowlist = await getAllowlist();

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-5xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Allowlist</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Users or domains explicitly allowed to claim subdomains
          </p>
        </div>
        <AdminNav />
        <AllowlistManager items={allowlist} />
      </main>
    </>
  );
}
