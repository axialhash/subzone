import { requireAuth } from '@/lib/auth';
import { getUserRecords } from '@/lib/actions';
import { Navbar } from '@/components/navbar';
import { SubdomainForm } from '@/components/subdomain-form';
import { SubdomainList } from '@/components/subdomain-list';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requireAuth();
  const records = await getUserRecords(user.id);

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-3xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Your Subdomains</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {records.length} subdomain{records.length !== 1 ? 's' : ''} claimed
          </p>
        </div>
        <SubdomainForm />
        <SubdomainList records={records} />
      </main>
    </>
  );
}
