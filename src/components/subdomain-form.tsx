'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CLIENT_ROOT_DOMAIN } from '@/lib/client-config';

export function SubdomainForm() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to claim');
        return;
      }
      setName('');
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async (value: string) => {
    if (value.length < 3) return;
    const res = await fetch(`/api/check?name=${encodeURIComponent(value)}`);
    const data = await res.json();
    if (!data.available) setError('Already taken');
    else setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex items-center flex-1 border rounded-md px-3">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          onBlur={(e) => checkAvailability(e.target.value)}
          placeholder="myname"
          className="flex-1 h-10 text-sm bg-transparent focus:outline-none font-mono"
          required
          minLength={3}
          maxLength={24}
          pattern="^[a-z0-9-]+$"
        />
        <span className="text-sm text-muted-foreground">.{CLIENT_ROOT_DOMAIN}</span>
      </div>
      <button
        type="submit"
        disabled={loading || !!error}
        className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? '...' : 'Claim'}
      </button>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </form>
  );
}
