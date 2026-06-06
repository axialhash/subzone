/**
 * Client-side config — values inlined at build time via NEXT_PUBLIC_ prefix.
 *
 * Use this in 'use client' components. Server components should import
 * from @/lib/config directly.
 */

export const CLIENT_ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "subzone.dev";
export const CLIENT_BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? CLIENT_ROOT_DOMAIN;
