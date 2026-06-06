'use client';

import { signIn } from 'next-auth/react';

interface LoginFormProps {
  providers: Record<string, { id: string; name: string }>;
}

export function LoginForm({ providers }: LoginFormProps) {
  return (
    <div className="space-y-4">
      {Object.values(providers).map((provider) => (
        <button
          key={provider.id}
          onClick={() => signIn(provider.id, { callbackUrl: '/dashboard' })}
          className="w-full h-10 rounded-md border text-sm font-medium hover:bg-muted transition-colors"
        >
          Continue with {provider.name}
        </button>
      ))}
    </div>
  );
}
