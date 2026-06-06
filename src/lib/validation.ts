/**
 * Subdomain validation — format, length, reserved-list, and profanity.
 *
 * Fully domain-agnostic: reads all thresholds from config.ts.
 */

import { z } from "zod";
import {
  SUBDOMAIN_MIN_LENGTH,
  SUBDOMAIN_MAX_LENGTH,
  SUBDOMAIN_REGEX,
  MAX_SUBDOMAINS_PER_USER,
} from "@/lib/config";
import {
  RESERVED_SUBDOMAIN_NAMES,
  RESERVED_SUBDOMAIN_PATTERNS,
} from "@/lib/reserved-list";
import { checkProfanity } from "@/lib/profanity";

/**
 * Subdomains that are reserved for platform use. This Set is the
 * client-side fast-path: it gives the claim form instant feedback
 * without an API call. The server ALSO checks the
 * `reserved_subdomains` DB table (see src/lib/admin.ts isNameReserved)
 * for dynamic reservations added by admins from the UI, so the
 * authoritative list lives in the DB.
 */
export const RESERVED_SUBDOMAINS = new Set<string>(
  RESERVED_SUBDOMAIN_NAMES
);

export type SubdomainValidationResult =
  | { ok: true; name: string }
  | { ok: false; reason: string };
/**
 * Lightweight validator for API routes. Returns { valid, name, error }.
 */
export function validateSubdomain(input: string): { valid: boolean; name: string | null; error: string } {
  const result = validateSubdomainFormat(input);
  if (result.ok) return { valid: true, name: result.name, error: "" };
  return { valid: false, name: null, error: result.reason };
}


/**
 * Validates a candidate subdomain string against format, length,
 * reserved-list, and profanity rules.
 */
export function validateSubdomainFormat(input: string): SubdomainValidationResult {
  const name = input.trim().toLowerCase();

  if (name.length < SUBDOMAIN_MIN_LENGTH) {
    return { ok: false, reason: `Subdomain must be at least ${SUBDOMAIN_MIN_LENGTH} characters.` };
  }
  if (name.length > SUBDOMAIN_MAX_LENGTH) {
    return { ok: false, reason: `Subdomain must be at most ${SUBDOMAIN_MAX_LENGTH} characters.` };
  }
  if (!SUBDOMAIN_REGEX.test(name)) {
    return {
      ok: false,
      reason: "Only lowercase letters, digits, and hyphens are allowed.",
    };
  }
  if (name.startsWith("-") || name.endsWith("-")) {
    return {
      ok: false,
      reason: "Subdomain cannot start or end with a hyphen.",
    };
  }
  if (RESERVED_SUBDOMAINS.has(name)) {
    return {
      ok: false,
      reason: name + " is reserved for platform use.",
    };
  }
  // Check regex patterns (www2, ns1, v3, single-letter, two-letter, etc.)
  for (const pattern of RESERVED_SUBDOMAIN_PATTERNS) {
    if (pattern.test(name)) {
      return {
        ok: false,
        reason: "That subdomain pattern is reserved.",
      };
    }
  }
  const profanity = checkProfanity(name);
  if (!profanity.ok) {
    return {
      ok: false,
      reason: profanity.reason ?? "That subdomain contains restricted language.",
    };
  }
  return { ok: true, name };
}

/**
 * Zod schema for use in forms / server actions.
 */
export const subdomainClaimSchema = z.object({
  name: z
    .string()
    .min(SUBDOMAIN_MIN_LENGTH, `At least ${SUBDOMAIN_MIN_LENGTH} characters`)
    .max(SUBDOMAIN_MAX_LENGTH, `At most ${SUBDOMAIN_MAX_LENGTH} characters`)
    .regex(SUBDOMAIN_REGEX, "Only lowercase letters, digits, and hyphens")
    .refine((s) => !s.startsWith("-") && !s.endsWith("-"), {
      message: "Cannot start or end with a hyphen",
    })
    .refine((s) => !RESERVED_SUBDOMAINS.has(s), {
      message: "That subdomain is reserved",
    })
    .refine(
      (s) => !RESERVED_SUBDOMAIN_PATTERNS.some((p) => p.test(s)),
      { message: "That subdomain pattern is reserved" }
    )
    .refine((s) => checkProfanity(s).ok, {
      message: "That subdomain is not allowed",
    }),
});

export type SubdomainClaimInput = z.infer<typeof subdomainClaimSchema>;

// ── DNS record validation ───────────────────────────────────────

function isValidA(v: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return false;
  return v.split(".").every((p) => {
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

function isValidCname(v: string): boolean {
  // Permissive — accepts punycode and most subdomain shapes. The
  // Cloudflare API will reject anything truly malformed downstream.
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(v);
}

/**
 * Zod schema for DNS record creation.
 */
export const dnsRecordSchema = z.object({
  type: z.enum(["A", "CNAME", "TXT"]),
  content: z
    .string()
    .min(1, "Content required")
    .max(255, "Content too long"),
  proxied: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.type === "TXT") return; // TXT accepts any non-empty text
  const ok = data.type === "A" ? isValidA(data.content) : isValidCname(data.content);
  if (!ok) {
    const expected = data.type === "A"
      ? "a valid IPv4 address (e.g. 192.0.2.1)"
      : "a fully-qualified domain (e.g. yourname.github.io)";
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["content"],
      message: `${data.type} record content must be ${expected}`,
    });
  }
});

export type DnsRecordInput = z.infer<typeof dnsRecordSchema>;

/**
 * Zod schema for DNS record PATCH (edit). The type field is optional
 * because the UI doesn't allow changing a record's type — only content
 * and proxied. When type is absent, the caller must supply the existing
 * record's type before running content validation.
 */
export const dnsRecordPatchSchema = z.object({
  type: z.enum(["A", "CNAME", "TXT"]).optional(),
  content: z.string().min(1, "Content required").max(255, "Content too long").optional(),
  proxied: z.boolean().optional(),
}).refine(
  (d) => d.content !== undefined || d.proxied !== undefined,
  { message: "At least one of content or proxied is required" },
);

/**
 * Validate PATCH content after merging in the existing record's type.
 * Call from the route handler when content is being changed.
 */
export function validateDnsPatchContent(
  content: string,
  type: "A" | "CNAME" | "TXT",
): { ok: true } | { ok: false; error: string } {
  if (type === "TXT") return { ok: true };
  const valid = type === "A" ? isValidA(content) : isValidCname(content);
  if (!valid) {
    const expected = type === "A"
      ? "a valid IPv4 address (e.g. 192.0.2.1)"
      : "a fully-qualified domain (e.g. yourname.github.io)";
    return { ok: false, error: `${type} record content must be ${expected}` };
  }
  return { ok: true };
}

export { MAX_SUBDOMAINS_PER_USER };
