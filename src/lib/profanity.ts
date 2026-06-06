/**
 * Minimal profanity filter for subdomain names.
 *
 * This is a basic blocklist — extend as needed. For a production
 * deployment, consider a more comprehensive filter or a third-party
 * service. This catches the obvious cases.
 */

const BLOCKLIST = new Set([
  // Common slurs and profanity — add as needed
  "fuck", "shit", "ass", "bitch", "dick", "cock", "pussy", "nigger",
  "nigga", "faggot", "retard", "cunt", "bastard", "damn", "slut",
  // Drug references
  "weed", "cocaine", "heroin", "meth", "drugs",
]);

/**
 * Check if a subdomain name contains restricted language.
 * Returns { ok: true } if clean, or { ok: false, reason } if blocked.
 */
export function checkProfanity(name: string): { ok: true } | { ok: false; reason: string } {
  const lower = name.toLowerCase();

  // Check exact match
  if (BLOCKLIST.has(lower)) {
    return { ok: false, reason: "That subdomain is not allowed." };
  }

  // Check if any blocked word appears as a substring
  for (const word of BLOCKLIST) {
    if (lower.includes(word)) {
      return { ok: false, reason: "That subdomain is not allowed." };
    }
  }

  return { ok: true };
}
