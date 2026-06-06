import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-muted-foreground">This page doesn&apos;t exist.</p>
        <Link href="/" className="text-sm underline underline-offset-4 hover:text-foreground transition-colors">
          Go home
        </Link>
      </div>
    </main>
  );
}
