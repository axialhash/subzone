import { requireAdmin } from '@/lib/auth';
import { Navbar } from '@/components/navbar';
import { AdminNav } from '@/components/admin-nav';
import { UserManager } from '@/components/user-manager';
import { getAllUsers } from '@/lib/actions';

export const metadata = { title: 'Users' };

export default async function UsersPage() {
  const user = await requireAdmin();
  const users = await getAllUsers();

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-5xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} registered user{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <AdminNav />
        <UserManager users={users} />
      </main>
    </>
  );
}
