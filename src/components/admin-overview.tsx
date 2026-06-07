'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  totalAdmins: number;
  totalSubdomains: number;
  activeSubdomains: number;
  revokedSubdomains: number;
  totalDnsRecords: number;
  totalReserved: number;
  totalAllowlisted: number;
}

interface RecentSub {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  user: { email: string; name: string | null } | null;
}

interface TopUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  subdomainLimit: number | null;
  _count: { subdomains: number };
}

export function AdminOverview() {
  const [data, setData] = useState<{
    stats: Stats;
    recentSubdomains: RecentSub[];
    topUsers: TopUser[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setData(d);
        else setError(d.error ?? 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Loading stats…</div>;
  if (error) return <div className="text-sm text-destructive">{error}</div>;
  if (!data) return null;

  const { stats, recentSubdomains, topUsers } = data;

  const cards = [
    { label: 'Users', value: stats.totalUsers, href: '/admin/users' },
    { label: 'Admins', value: stats.totalAdmins, href: '/admin/users' },
    { label: 'Active Subdomains', value: stats.activeSubdomains, href: '/admin' },
    { label: 'Revoked', value: stats.revokedSubdomains, href: '/admin' },
    { label: 'DNS Records', value: stats.totalDnsRecords, href: '/admin' },
    { label: 'Reserved Names', value: stats.totalReserved, href: '/admin/reserved' },
    { label: 'Allowlisted', value: stats.totalAllowlisted, href: '/admin/allowlist' },
  ];

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="border rounded-lg p-4 hover:bg-muted transition-colors"
          >
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent subdomains */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Recent Subdomains</h2>
          <div className="border rounded-lg divide-y">
            {recentSubdomains.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No subdomains yet</div>
            )}
            {recentSubdomains.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-mono">{s.name}</span>
                  <span className="text-muted-foreground ml-2">
                    {s.user?.email ?? 'unowned'}
                  </span>
                </div>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                    s.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top users */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Top Users</h2>
          <div className="border rounded-lg divide-y">
            {topUsers.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No users yet</div>
            )}
            {topUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-medium">{u.name ?? 'Unnamed'}</span>
                  <span className="text-muted-foreground ml-2">{u.email}</span>
                  {u.isAdmin && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted font-mono">
                      admin
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {u._count.subdomains} subs
                  {u.subdomainLimit !== null && (
                    <span className="ml-1">
                      / {u.subdomainLimit === -1 ? '∞' : u.subdomainLimit} limit
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
