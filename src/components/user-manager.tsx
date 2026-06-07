'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUser } from '@/lib/actions';

interface User {
  id: string;
  name?: string | null;
  email: string;
  isAdmin?: boolean;
  subdomainLimit: number | null;
  githubLogin?: string | null;
  _count?: { subdomains: number };
}

export function UserManager({ users }: { users: User[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [limitValue, setLimitValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(u: User) {
    setEditingId(u.id);
    setLimitValue(u.subdomainLimit === null ? '' : u.subdomainLimit === -1 ? '-1' : String(u.subdomainLimit));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setLimitValue('');
    setError(null);
  }

  async function saveLimit(userId: string) {
    setSaving(true);
    setError(null);
    try {
      const val = limitValue.trim();
      const limit = val === '' ? null : val === '-1' ? -1 : Number(val);
      if (limit !== null && limit !== -1 && (!Number.isFinite(limit) || limit < 0)) {
        setError('Invalid limit — use a number ≥ 0, -1 for unlimited, or blank for tier defaults');
        setSaving(false);
        return;
      }
      await updateUser(userId, { subdomainLimit: limit });
      setEditingId(null);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAdmin(u: User) {
    if (!confirm(`${u.isAdmin ? 'Remove admin from' : 'Make admin'} ${u.email}?`)) return;
    setSaving(true);
    try {
      await updateUser(u.id, { isAdmin: !u.isAdmin });
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border rounded-lg divide-y">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10">{error}</div>
      )}
      {users.map((u) => (
        <div key={u.id} className="p-4 text-sm space-y-2">
          {/* Row 1: identity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{u.name ?? 'Unnamed'}</span>
              <span className="text-muted-foreground">{u.email}</span>
              {u.githubLogin && (
                <span className="text-xs text-muted-foreground">@{u.githubLogin}</span>
              )}
              {u.isAdmin && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-mono">admin</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {u._count?.subdomains ?? 0} subs
            </span>
          </div>

          {/* Row 2: controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Subdomain limit */}
            {editingId === u.id ? (
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Limit:</label>
                <input
                  type="text"
                  value={limitValue}
                  onChange={(e) => setLimitValue(e.target.value)}
                  placeholder="tier default"
                  className="w-24 border rounded px-2 py-1 text-xs font-mono"
                />
                <span className="text-xs text-muted-foreground">(-1=∞, blank=tier)</span>
                <button
                  onClick={() => saveLimit(u.id)}
                  disabled={saving}
                  className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded disabled:opacity-50"
                >
                  {saving ? '…' : 'Save'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => startEdit(u)}
                className="text-xs border rounded px-2 py-1 hover:bg-muted transition-colors"
              >
                Limit: {u.subdomainLimit === null ? 'tier default' : u.subdomainLimit === -1 ? '∞' : u.subdomainLimit}
              </button>
            )}

            {/* Admin toggle */}
            <button
              onClick={() => toggleAdmin(u)}
              disabled={saving}
              className={`text-xs border rounded px-2 py-1 transition-colors ${
                u.isAdmin
                  ? 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20'
                  : 'hover:bg-muted'
              }`}
            >
              {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
