'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePlatformSettings } from '@/lib/actions';

interface TierConfig {
  minDays: number;
  limit: number;
}

interface PlatformConfig {
  tiers: Record<number, TierConfig>;
  globalSubdomainLimit: number;
  platformName: string;
  registrationsOpen: boolean;
}

export function PlatformSettingsForm({
  config,
  envAdminEmails,
  envAdminDomains,
}: {
  config: PlatformConfig;
  envAdminEmails: string[];
  envAdminDomains: string[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Tier fields
  const [t0Min, setT0Min] = useState(String(config.tiers[0]?.minDays ?? 0));
  const [t0Lim, setT0Lim] = useState(String(config.tiers[0]?.limit ?? 0));
  const [t1Min, setT1Min] = useState(String(config.tiers[1]?.minDays ?? 30));
  const [t1Lim, setT1Lim] = useState(String(config.tiers[1]?.limit ?? 1));
  const [t2Min, setT2Min] = useState(String(config.tiers[2]?.minDays ?? 180));
  const [t2Lim, setT2Lim] = useState(String(config.tiers[2]?.limit ?? 2));

  // Other settings
  const [globalLimit, setGlobalLimit] = useState(
    config.globalSubdomainLimit === -1 ? '-1' : String(config.globalSubdomainLimit)
  );
  const [platformName, setPlatformName] = useState(config.platformName);
  const [regOpen, setRegOpen] = useState(config.registrationsOpen);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      await updatePlatformSettings({
        'tier_0_min_days': t0Min,
        'tier_0_limit': t0Lim,
        'tier_1_min_days': t1Min,
        'tier_1_limit': t1Lim,
        'tier_2_min_days': t2Min,
        'tier_2_limit': t2Lim,
        'global_subdomain_limit': globalLimit,
        'platform_name': platformName,
        'registrations_open': String(regOpen),
      });
      setMsg('Saved!');
      router.refresh();
    } catch {
      setMsg('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Admin bootstrapping info */}
      <section className="border rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-semibold">Admin Bootstrapping</h2>
        <p className="text-xs text-muted-foreground">
          Admins are promoted on sign-in if their email matches any source below.
          Sources are checked in order: env emails → env domains → DB allowlist.
          Admins can also be toggled per-user in the{' '}
          <a href="/admin/users" className="underline">Users</a> tab.
        </p>
        <div className="space-y-2">
          <div>
            <span className="text-xs font-mono text-muted-foreground">BOOTSTRAP_ADMIN_EMAILS:</span>
            <div className="text-sm mt-1">
              {envAdminEmails.length > 0 ? (
                envAdminEmails.map((e) => (
                  <span key={e} className="inline-block border rounded px-1.5 py-0.5 text-xs font-mono mr-1 mb-1">
                    {e}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">not set</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-xs font-mono text-muted-foreground">ADMIN_EMAIL_DOMAINS:</span>
            <div className="text-sm mt-1">
              {envAdminDomains.length > 0 ? (
                envAdminDomains.map((d) => (
                  <span key={d} className="inline-block border rounded px-1.5 py-0.5 text-xs font-mono mr-1 mb-1">
                    *@{d}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">not set</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tier config */}
      <section className="border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold">Eligibility Tiers</h2>
        <p className="text-xs text-muted-foreground">
          Users progress through tiers based on GitHub account age. Higher tiers get more subdomains.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {([0, 1, 2] as const).map((tier) => {
            const mins = [t0Min, t1Min, t2Min];
            const lims = [t0Lim, t1Lim, t2Lim];
            const setters = [
              [setT0Min, setT0Lim],
              [setT1Min, setT1Lim],
              [setT2Min, setT2Lim],
            ];
            const labels = ['Tier 0 (new)', 'Tier 1 (established)', 'Tier 2 (veteran)'];
            return (
              <div key={tier} className="border rounded p-3 space-y-2">
                <div className="text-xs font-semibold">{labels[tier]}</div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Min account age (days)</label>
                  <input
                    type="number"
                    value={mins[tier]}
                    onChange={(e) => setters[tier][0](e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm font-mono"
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Subdomain limit</label>
                  <input
                    type="number"
                    value={lims[tier]}
                    onChange={(e) => setters[tier][1](e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm font-mono"
                    min={0}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Global settings */}
      <section className="border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold">Platform Settings</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Platform name</label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Global subdomain limit per user (-1 = unlimited)
            </label>
            <input
              type="number"
              value={globalLimit}
              onChange={(e) => setGlobalLimit(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm font-mono"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={regOpen}
            onChange={(e) => setRegOpen(e.target.checked)}
            id="reg-open"
            className="rounded"
          />
          <label htmlFor="reg-open" className="text-sm">
            Registrations open (users can sign in and claim subdomains)
          </label>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {msg && (
          <span
            className={`text-sm ${
              msg === 'Saved!' ? 'text-green-600 dark:text-green-400' : 'text-destructive'
            }`}
          >
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
