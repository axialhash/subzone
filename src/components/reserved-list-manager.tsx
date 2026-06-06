'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReservedListManager({ items }: { items: string[] }) {
  const [newItem, setNewItem] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const addItem = async () => {
    if (!newItem.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/admin/reserved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItem.trim(), action: 'add' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to add');
        return;
      }
      setNewItem('');
      router.refresh();
    } catch {
      setError('Network error');
    }
  };

  const removeItem = async (name: string) => {
    try {
      const res = await fetch('/api/admin/reserved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, action: 'remove' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed to remove');
        return;
      }
      router.refresh();
    } catch {
      alert('Network error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => { setNewItem(e.target.value); setError(''); }}
          placeholder="Add reserved name..."
          className="flex-1 h-9 px-3 rounded border text-sm bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button onClick={addItem} className="h-9 px-4 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Add
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div key={item} className="flex items-center justify-between p-3 text-sm font-mono">
            <span>{item}</span>
            <button onClick={() => removeItem(item)} className="text-xs text-destructive hover:underline">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
