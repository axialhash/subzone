import { requireAdmin } from '@/lib/auth';
import { Navbar } from '@/components/navbar';
import { AdminNav } from '@/components/admin-nav';
import { PlatformSettingsForm } from '@/components/platform-settings';
import { getPlatformConfig } from '@/lib/settings';
import { bootstrapAdminEmails, adminEmailDomains } from '@/lib/config';

export const metadata = { title: 'Admin — Settings' };

export default async function SettingsPage() {
  const user = await requireAdmin();
  const config = await getPlatformConfig();

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-5xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure tiers, limits, and platform behavior
          </p>
        </div>
        <AdminNav />
        <PlatformSettingsForm
          config={config}
          envAdminEmails={bootstrapAdminEmails()}
          envAdminDomains={adminEmailDomains()}
        />
      </main>
    </>
  );
}
