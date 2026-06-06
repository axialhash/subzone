/**
 * Cloudflare DNS service.
 * Server-side only — never import this from a client component.
 *
 * All operations are forced into the configured zone via the env-configured
 * zone id. Users never interact with the bare Cloudflare API.
 *
 * To swap DNS providers, replace this module and update the `DNS_PROVIDER`
 * env var. The rest of the codebase imports from this module's public API.
 */

import "server-only";
import {
  ROOT_DOMAIN,
  cloudflareApiToken,
  cloudflareZoneId,
} from "@/lib/config";

const API_BASE = "https://api.cloudflare.com/client/v4";

function authHeaders() {
  return {
    Authorization: `Bearer ${cloudflareApiToken()}`,
    "Content-Type": "application/json",
  };
}

/**
 * Force the FQDN into the configured root domain zone.
 * Throws on any input that would escape the zone.
 */
function assertInZone(name: string) {
  const lower = name.toLowerCase().trim();
  const suffix = "." + ROOT_DOMAIN;
  if (!lower.endsWith(suffix) && lower !== ROOT_DOMAIN) {
    throw new Error(`Refusing to operate outside ${ROOT_DOMAIN}: ${name}`);
  }
  // Reject anything that looks like a suffix of another zone
  if (lower.endsWith(`.${ROOT_DOMAIN}.${ROOT_DOMAIN}`)) {
    throw new Error("Invalid hostname");
  }
  return lower;
}

/**
 * Record types the platform manages on behalf of users.
 * A and CNAME cover the common case of pointing a subdomain at an
 * origin (tunnel, GitHub Pages, Vercel alias, server IP). TXT is
 * supported for domain-ownership verification tokens — many services
 * (Google, Facebook, GitHub, etc.) require a TXT record to prove you
 * control the hostname.
 */
export type CfRecordType = "A" | "CNAME" | "TXT";

export interface DnsRecordSpec {
  type: CfRecordType;
  name: string; // e.g. "abel" or "blog.abel"
  content: string;
  proxied?: boolean;
  ttl?: number;
}

async function cfFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
    // Cloudflare data should not be aggressively cached
    cache: "no-store",
  });
  const body = (await res.json()) as {
    success: boolean;
    result: T;
    errors?: unknown[];
  };
  if (!body.success) {
    throw new Error(
      `Cloudflare API error: ${JSON.stringify(body.errors ?? "unknown")}`
    );
  }
  return body.result;
}

export async function listDnsRecords(prefix: string) {
  const fqdn = assertInZone(
    prefix.includes(".") ? prefix : `${prefix}.${ROOT_DOMAIN}`
  );
  // URL-encode the dots in the name query
  const url = `/zones/${cloudflareZoneId()}/dns_records?name=${encodeURIComponent(fqdn)}`;
  return cfFetch<Array<{
    id: string;
    type: CfRecordType;
    name: string;
    content: string;
    proxied: boolean;
    ttl: number;
  }>>(url);
}

/**
 * List every DNS record in the root domain zone (paginated).
 * Used by the Cloudflare→DB sync to discover subdomains created
 * outside the platform.
 */
export async function listAllDnsRecords() {
  type CfRecord = {
    id: string;
    type: string;
    name: string;
    content: string;
    proxied: boolean;
    ttl: number;
  };
  const all: CfRecord[] = [];
  let page = 1;
  // Cloudflare caps per_page at 100; loop until a short page.
  while (true) {
    const batch = await cfFetch<CfRecord[]>(
      `/zones/${cloudflareZoneId()}/dns_records?per_page=100&page=${page}`
    );
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return all;
}

export async function createDnsRecord(spec: DnsRecordSpec) {
  const fqdn = assertInZone(
    spec.name.includes(".") ? spec.name : `${spec.name}.${ROOT_DOMAIN}`
  );
  const proxied = spec.proxied ?? spec.type !== "TXT";
  const body = {
    type: spec.type,
    name: fqdn,
    content: spec.content,
    proxied,
    ttl: spec.ttl ?? (proxied ? 1 : 3600),
  };
  return cfFetch<{
    id: string;
    type: CfRecordType;
    name: string;
    content: string;
    proxied: boolean;
  }>(`/zones/${cloudflareZoneId()}/dns_records`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateDnsRecord(
  recordId: string,
  spec: Partial<DnsRecordSpec>
) {
  const body: Record<string, unknown> = {};
  if (spec.type) body.type = spec.type;
  if (spec.name) {
    body.name = assertInZone(
      spec.name.includes(".") ? spec.name : `${spec.name}.${ROOT_DOMAIN}`
    );
  }
  if (spec.content !== undefined) body.content = spec.content;
  if (spec.proxied !== undefined) body.proxied = spec.proxied;
  if (spec.ttl !== undefined) body.ttl = spec.ttl;
  return cfFetch<{
    id: string;
    type: CfRecordType;
    name: string;
    content: string;
    proxied: boolean;
  }>(`/zones/${cloudflareZoneId()}/dns_records/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteDnsRecord(recordId: string) {
  return cfFetch<{ id: string }>(
    `/zones/${cloudflareZoneId()}/dns_records/${recordId}`,
    { method: "DELETE" }
  );
}

export async function deleteAllRecordsForSubdomain(prefix: string) {
  const records = await listDnsRecords(prefix);
  await Promise.all(records.map((r) => deleteDnsRecord(r.id)));
  return records.length;
}
