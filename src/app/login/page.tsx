import Link from 'next/link';
import { BRAND_NAME } from '@/lib/config';
import { getProviders } from '@/lib/auth';
import { LoginForm } from '@/components/login-form';

export const metadata = { title: 'Sign In' };

export default async function LoginPage() {
  const providers = await getProviders();

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold">{BRAND_NAME}</Link>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to manage your subdomains</p>
        </div>
        <LoginForm providers={providers} />
      </div>
    </main>
  );
}
