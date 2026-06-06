'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CLIENT_ROOT_DOMAIN } from '@/lib/client-config';

interface Record {
  id: string;
  name: string;
  createdAt: Date | string;
}

export function SubdomainList({ records }: { records: Record[] }) {
  const router = useRouter();

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No subdomains claimed yet. Create one above.
      </div>
    );
  }

  return (
    <div className="border rounded-lg divide-y">
      {records.map((r) => (
        <div key={r.id} className="flex items-center justify-between p-4">
          <div>
            <Link href={`/dashboard/${r.name}`} className="font-mono text-sm hover:underline">
              {r.name}.{CLIENT_ROOT_DOMAIN}
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">
              Claimed {new Date(r.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/${r.name}`}
              className="text-xs px-3 py-1.5 rounded border hover:bg-muted transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={async () => {
                if (!confirm(`Delete ${r.name}.${CLIENT_ROOT_DOMAIN}?`)) return;
                await fetch(`/api/records/${r.id}`, { method: 'DELETE' });
                router.refresh();
              }}
              className="text-xs px-3 py-1.5 rounded border text-destructive hover:bg-destructive/10 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
