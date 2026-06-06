import Link from 'next/link';
import { BRAND_NAME, ROOT_DOMAIN } from '@/lib/config';
import { Navbar } from '@/components/navbar';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex flex-col items-center justify-center min-h-[80vh] p-8">
        <div className="max-w-2xl text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold tracking-tight">{BRAND_NAME}</h1>
            <p className="text-xl text-muted-foreground">
              Self-hosted subdomain provisioning platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <FeatureCard title="Modular DNS" description="Pluggable DNS providers. Cloudflare out of the box, swap in whatever you want." />
            <FeatureCard title="OAuth Ready" description="GitHub, Google, or email magic links. Configure via env vars, zero code changes." />
            <FeatureCard title="Config-Driven" description="Every knob exposed as an environment variable. Fork it, tweak it, ship it." />
          </div>

          <div className="p-4 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              Managing subdomains for{' '}
              <span className="font-mono font-semibold text-foreground">{ROOT_DOMAIN}</span>
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-10 px-8 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
            <a
              href="https://github.com/axialhash/subzone"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-10 px-8 rounded-md text-sm font-medium border hover:bg-muted transition-colors"
            >
              GitHub
            </a>
          </div>

          <footer className="pt-8 text-sm text-muted-foreground">
            Built with Next.js, Prisma, and Cloudflare DNS
          </footer>
        </div>
      </main>
    </>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-5 rounded-lg border">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
