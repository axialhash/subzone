# Subzone

A self-hosted subdomain provisioning platform. Let users claim and manage subdomains under your root domain with Cloudflare DNS integration.

**Plug and play.** Copy `.env.example`, fill in your keys, `docker compose up`. Done.

## Features

- **Instant provisioning** — claim subdomains via Cloudflare DNS API
- **GitHub OAuth** — NextAuth v5, database sessions
- **Admin panel** — manage allowlists, reserved names, revoke subdomains
- **Modular** — swap DNS providers, auth providers, eligibility rules
- **Neutral UI** — black/white/gray, zero accent colors, fully themeable via CSS vars
- **Type-safe** — TypeScript + Zod validation throughout
- **Docker ready** — multi-stage build, one-command deploy

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL 16 + Prisma 6
- **Auth:** NextAuth v5 (GitHub OAuth)
- **DNS:** Cloudflare (swappable)
- **Styling:** Tailwind CSS 3
- **Language:** TypeScript

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/your-org/subzone.git
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
git clone https://github.com/your-org/subzone.git
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

### Cloudflare API Token

1. Go to [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Create a token with permissions: `Zone > DNS > Edit`, `Zone > Zone > Read`
3. Select the specific zone you want to manage

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/check?name=xxx` | Check subdomain availability |

### Authenticated

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/claim` | Claim a subdomain |
| `DELETE` | `/api/records/[id]` | Delete a subdomain and its DNS records |
| `POST` | `/api/records/[id]` | Add a DNS record (A, CNAME, or TXT) |
| `PUT` | `/api/records/[id]` | Remove a DNS record |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/allowlist` | Add/remove email allowlist entries |
| `POST` | `/api/admin/reserved` | Add/remove reserved subdomain names |
| `POST` | `/api/admin/revoke` | Revoke a subdomain |
| `POST` | `/api/admin/sync` | Sync DNS records from Cloudflare |

## Project Structure

```
subzone/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth handler
│   │   │   ├── admin/         # Admin API (allowlist, reserved, revoke, sync)
│   │   │   ├── claim/         # Subdomain claim
│   │   │   ├── check/         # Availability check
│   │   │   └── records/       # DNS record CRUD
│   │   ├── admin/             # Admin pages (overview, allowlist, reserved, users)
│   │   ├── dashboard/         # User dashboard + per-subdomain DNS editor
│   │   ├── login/             # GitHub sign-in
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css        # Tailwind + neutral CSS vars
│   ├── components/            # React components
│   ├── lib/                   # Core modules
│   │   ├── auth.ts            # NextAuth v5 config (GitHub only)
│   │   ├── actions.ts         # Server actions (claim, CRUD, admin)
│   │   ├── admin.ts           # Admin authority resolution
│   │   ├── cloudflare.ts      # Cloudflare DNS provider client
│   │   ├── config.ts          # Server-side env config
│   │   ├── client-config.ts   # Client-side env config (NEXT_PUBLIC_*)
│   │   ├── eligibility.ts     # Tier-based claim limits
│   │   ├── validation.ts      # Zod schemas + profanity check
│   │   ├── reserved-list.ts   # Static reserved names
│   │   ├── profanity.ts       # Blocklist filter
│   │   └── prisma.ts          # Prisma client singleton
│   └── middleware.ts           # Route protection (/dashboard, /admin)
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Admin bootstrap script
├── docker-compose.yml         # Postgres + app services
├── Dockerfile                 # Multi-stage production build
├── tailwind.config.ts         # Neutral theme config
├── .env.example               # All env vars documented
└── package.json
```

## Architecture

### Modular DNS Provider

`src/lib/cloudflare.ts` is the default DNS provider. To swap it:

1. Create `src/lib/your-provider.ts` implementing the same interface:
   - `createDnsRecord({ type, name, content, proxied })` → `{ id }`
   - `deleteDnsRecord(recordId)`
   - `deleteAllRecordsForSubdomain(name)`
2. Update imports in `src/lib/actions.ts`

### Eligibility System

`src/lib/eligibility.ts` controls how many subdomains each user can claim based on account age tiers. Override with per-user limits via the admin panel (`subdomainLimit` column on User).

### Admin Authority

Three sources (checked in order):
1. `ADMIN_EMAIL_DOMAINS` — any email @domain gets admin
2. `BOOTSTRAP_ADMIN_EMAILS` — exact emails get admin
3. `AdminAllowlist` DB table — managed from `/admin/allowlist`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing-feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT — see [LICENSE](LICENSE)
