'use client';

interface User {
  id: string;
  name?: string | null;
  email: string;
  isAdmin?: boolean;
  _count?: { subdomains: number };
}

export function UserManager({ users }: { users: User[] }) {
  return (
    <div className="border rounded-lg divide-y">
      {users.map((u) => (
        <div key={u.id} className="flex items-center justify-between p-4 text-sm">
          <div>
            <span className="font-medium">{u.name ?? 'Unnamed'}</span>
            <span className="text-muted-foreground ml-2">{u.email}</span>
            {u.isAdmin && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted font-mono">admin</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {u._count?.subdomains ?? 0} subs
          </span>
        </div>
      ))}
    </div>
  );
}