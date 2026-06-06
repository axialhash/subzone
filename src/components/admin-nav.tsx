'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/reserved', label: 'Reserved' },
  { href: '/admin/allowlist', label: 'Allowlist' },
  { href: '/admin/users', label: 'Users' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border rounded-lg p-1 w-fit">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            pathname === l.href
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-muted-foreground'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
