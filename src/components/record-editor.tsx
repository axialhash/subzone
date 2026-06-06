'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const RECORD_TYPES = ['A', 'CNAME', 'TXT'] as const;

interface DnsRecord {
  id: string;
  type: string;
  content: string;
  proxied?: boolean;
  cloudflareRecordId?: string | null;
}

interface RecordEditorProps {
  record: {
    id: string;
    name: string;
    records: DnsRecord[];
  };
}

export function RecordEditor({ record }: RecordEditorProps) {
  const [type, setType] = useState<string>('CNAME');
  const [content, setContent] = useState('');
  const [proxied, setProxied] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const addRecord = async () => {
    if (!content.trim()) return;
    setLoading(true);
    await fetch(`/api/records/${record.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, name: record.name, content: content.trim(), proxied }),
    });
    setContent('');
    setLoading(false);
    router.refresh();
  };

  const removeRecord = async (dnsRecordId: string) => {
    await fetch(`/api/records/${record.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: dnsRecordId }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Existing records */}
      {record.records.length > 0 ? (
        <div className="border rounded-lg divide-y">
          {record.records.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 text-sm">
              <div className="flex gap-4 font-mono">
                <span className="w-12 text-muted-foreground">{r.type}</span>
                <span>{r.content}</span>
                {r.proxied !== undefined && (
                  <span className="text-muted-foreground">{r.proxied ? 'proxied' : 'DNS only'}</span>
                )}
              </div>
              <button
                onClick={() => removeRecord(r.id)}
                className="text-xs text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No DNS records yet. Add one below.</p>
      )}

      {/* Add record form */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium">Add DNS Record</h3>
        <div className="flex gap-2 flex-wrap">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-9 px-2 rounded border text-sm bg-background"
          >
            {RECORD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Target (e.g. 1.2.3.4 or example.com)"
            className="flex-1 h-9 px-2 rounded border text-sm bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {type === 'CNAME' && (
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={proxied}
                onChange={(e) => setProxied(e.target.checked)}
                className="rounded"
              />
              Proxied
            </label>
          )}
          <button
            onClick={addRecord}
            disabled={loading || !content.trim()}
            className="h-9 px-4 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? '...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
