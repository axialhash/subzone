# Subzone

**Self-hosted subdomain provisioning.** Let users claim `*.yourdomain.com` subdomains with zero effort.

Plug and play — `docker compose up` and you're live in 2 minutes.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://docker.com/)

## What it does

Users sign in with GitHub, pick a subdomain name, and point it anywhere — a portfolio, a project, a redirect. You manage everything from an admin dashboard.

**Use cases:** developer communities, open-source projects, teams, schools, or anyone who wants to offer branded subdomains without the DNS headache.

## Features

- **Instant provisioning** — claim subdomains via Cloudflare DNS API
- **GitHub OAuth** — NextAuth v5, database sessions, zero passwords
- **Admin panel** — manage allowlists, reserved names, revoke subdomains, per-user limits
- **Configurable tiers** — eligibility rules based on account age, fully customizable
- **Platform settings** — toggle features, set global limits, all from the UI
- **DNS sync** — import existing records from Cloudflare automatically
- **Modular DNS** — Cloudflare out of the box, swap in any provider
- **Neutral UI** — black/white/gray, zero accent colors, fully themeable via CSS vars
- **Type-safe** — TypeScript + Zod validation throughout
- **Docker ready** — multi-stage build, one-command deploy

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/axialhash/subzone.git
cd subzone

# Configure
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Build and start
docker compose up -d

# Run migrations
docker compose exec app npx prisma db push

# Seed admin (optional — or set BOOTSTRAP_ADMIN_EMAILS in .env)
docker compose exec app npx tsx prisma/seed.ts you@example.com
```

Visit `http://localhost:3000`

### Local development

```bash
git clone https://github.com/axialhash/subzone.git
cd subzone

npm install
cp .env.example .env.local
# Edit .env.local with your values

npm run db:generate
npm run db:push
npm run dev
```

Visit `http://localhost:3000`

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth secret — generate with `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` | GitHub OAuth client ID ([create here](https://github.com/settings/developers)) |
| `AUTH_GITHUB_SECRET` | GitHub OAuth client secret |
| `ROOT_DOMAIN` | Your root domain (e.g. `example.com`) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with DNS edit permissions |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `CLOUDFLARE_ZONE_ID` | auto-detected | Cloudflare Zone ID |
| `BRAND_NAME` | `ROOT_DOMAIN` | Display name for the platform |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `ROOT_DOMAIN` | Client-side domain (for SSR) |
| `NEXT_PUBLIC_BRAND_NAME` | `BRAND_NAME` | Client-side brand name |
| `BOOTSTRAP_ADMIN_EMAILS` | — | Comma-separated emails auto-promoted to admin on sign-in |
| `ADMIN_EMAIL_DOMAINS` | — | Comma-separated email domains that get admin (e.g. `yourcompany.com`) |
| `APP_PORT` | `3000` | Port exposed by Docker |

## API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/check?name=xxx` | — | Check subdomain availability |
| `POST` | `/api/claim` | ✓ | Claim a subdomain |
| `DELETE` | `/api/records/[id]` | ✓ | Delete a subdomain and its DNS records |
| `POST` | `/api/records/[id]` | ✓ | Add a DNS record (A, CNAME, or TXT) |
| `PUT` | `/api/records/[id]` | ✓ | Remove a DNS record |
| `POST` | `/api/admin/allowlist` | admin | Add/remove email allowlist entries |
| `POST` | `/api/admin/reserved` | admin | Add/remove reserved subdomain names |
| `POST` | `/api/admin/revoke` | admin | Revoke a subdomain |
| `POST` | `/api/admin/sync` | admin | Sync DNS records from Cloudflare |

## Architecture

```
subzone/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── admin/             # Admin pages (overview, allowlist, reserved, users, settings)
│   │   ├── dashboard/         # User dashboard + per-subdomain DNS editor
│   │   └── login/             # GitHub sign-in
│   ├── components/            # React components
│   └── lib/                   # Core modules
│       ├── auth.ts            # NextAuth v5 config
│       ├── actions.ts         # Server actions
│       ├── admin.ts           # Admin authority resolution
│       ├── cloudflare.ts      # DNS provider client
│       ├── eligibility.ts     # Tier-based claim limits
│       ├── settings.ts        # Platform-wide settings
│       ├── validation.ts      # Zod schemas + profanity check
│       └── reserved-list.ts   # Static reserved names
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Admin bootstrap
├── docker-compose.yml         # Postgres + app
├── Dockerfile                 # Multi-stage production build
└── .env.example               # All env vars documented
```

### Modular DNS Provider

`src/lib/cloudflare.ts` is the default. To swap it:

1. Create `src/lib/your-provider.ts` implementing the same interface
2. Update imports in `src/lib/actions.ts`

### Admin Authority

Three sources (checked in order):
1. `ADMIN_EMAIL_DOMAINS` — any email @domain gets admin
2. `BOOTSTRAP_ADMIN_EMAILS` — exact emails get admin
3. `AdminAllowlist` DB table — managed from `/admin/allowlist`

## License

MIT — see [LICENSE](LICENSE)
