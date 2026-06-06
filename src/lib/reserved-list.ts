/**
 * Static reserved subdomain names and regex patterns.
 *
 * This is the CLIENT-SIDE fast-path: it gives the claim form instant
 * feedback without an API call. The server ALSO checks the
 * `reserved_subdomains` DB table (see src/lib/admin.ts isNameReserved)
 * for dynamic reservations added by admins from the UI, so the
 * authoritative list lives in the DB.
 *
 * Edit this file to add your own platform-specific reservations.
 */

export const RESERVED_SUBDOMAIN_NAMES: string[] = [
  // Platform
  "www", "mail", "smtp", "imap", "pop3", "ftp", "sftp", "ssh",
  "dns", "ns1", "ns2", "ns3", "ns4", "mx", "mta", "staging", "prod",
  "beta", "alpha", "dev", "test", "qa", "ci", "cd", "ops", "sre",
  "status", "health", "monitor", "metrics", "grafana", "prometheus",
  // Auth
  "login", "signin", "signup", "register", "auth", "oauth", "sso",
  "api", "graphql", "webhook", "hooks", "tokens",
  // Infrastructure
  "admin", "dashboard", "panel", "console", "manage", "settings",
  "backup", "db", "database", "redis", "cache", "queue", "worker",
  "cron", "scheduler", "nginx", "caddy", "traefik",
  // Brand / Legal
  "blog", "docs", "help", "support", "contact", "about", "legal",
  "privacy", "terms", "security", "abuse", "dmca",
  // Common
  "localhost", "local", "internal", "private", "public", "static",
  "assets", "media", "cdn", "images", "img", "files", "downloads",
];

/**
 * Regex patterns for reserved subdomain patterns.
 * Each pattern reserves a whole CLASS of names (e.g. all single-letter
 * subdomains, all two-letter country codes, all numeric names).
 */
export const RESERVED_SUBDOMAIN_PATTERNS: RegExp[] = [
  /^\d+$/,                   // all numbers (e.g. "123", "42")
  /^[a-z]$/,                 // single letter (e.g. "a", "z")
  /^[a-z]{2}$/,             // two-letter codes (e.g. "us", "uk", "go")
  /^ns\d+$/,                // nameservers (e.g. "ns1", "ns99")
  /^www\d+$/,               // www variants (e.g. "www2", "www100")
  /^v\d+$/,                 // version-like (e.g. "v1", "v2", "v100")
  /^cdn\d+$/,               // CDN nodes (e.g. "cdn1", "cdn2")
  /^smtp\d+$/,              // mail (e.g. "smtp1")
  /^mail\d+$/,              // mail (e.g. "mail1")
  /^dev\d+$/,               // dev (e.g. "dev1", "dev2")
  /^staging\d+$/,           // staging (e.g. "staging1")
  /^test\d+$/,              // test (e.g. "test1")
  /^prod\d+$/,              // prod (e.g. "prod1")
];
