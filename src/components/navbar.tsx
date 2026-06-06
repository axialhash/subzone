'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { CLIENT_BRAND_NAME } from '@/lib/client-config';

interface NavbarProps {
  user?: { name?: string | null; email?: string | null; isAdmin?: boolean } | null;
}

export function Navbar({ user }: NavbarProps) {
  return (
    <nav className="border-b">
      <div className="max-w-5xl mx-auto px-8 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">{CLIENT_BRAND_NAME}</Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-muted-foreground transition-colors">Dashboard</Link>
              {user.isAdmin && (
                <Link href="/admin" className="hover:text-muted-foreground transition-colors">Admin</Link>
              )}
              <span className="text-muted-foreground">{user.name ?? user.email}</span>
              <button onClick={() => signOut()} className="text-muted-foreground hover:text-foreground transition-colors">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="hover:text-muted-foreground transition-colors">Sign in</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
