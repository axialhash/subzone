/**
 * Server actions for subzone.
 *
 * All domain-specific logic lives in lib/.
 * These are the glue between pages and the database + DNS provider.
 */

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateSubdomain } from "@/lib/validation";
import { createDnsRecord, deleteDnsRecord, deleteAllRecordsForSubdomain } from "@/lib/cloudflare";
import { isNameReserved } from "@/lib/admin";
import { canClaim } from "@/lib/eligibility";

// ── User actions ────────────────────────────────────────────────

export async function getUserRecords(userId: string) {
  return prisma.subdomain.findMany({
    where: { userId, status: { not: "revoked" } },
    orderBy: { createdAt: "desc" },
    include: { records: true },
  });
}

export async function getRecordByName(name: string, userId: string) {
  return prisma.subdomain.findFirst({
    where: { name, userId, status: { not: "revoked" } },
    include: { records: { orderBy: { createdAt: "asc" } } },
  });
}

export async function claimSubdomain(rawName: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be signed in.");

  const eligibility = await canClaim(session.user.id);
  if (!eligibility.ok) throw new Error(eligibility.reason ?? "Not eligible to claim.");

  const v = validateSubdomain(rawName);
  if (!v.valid) throw new Error(v.error);

  const existing = await prisma.subdomain.findUnique({ where: { name: v.name! } });
  if (existing?.status === "active") throw new Error("Already taken.");
  if (existing?.status === "revoked") throw new Error("This name was revoked.");

  if (await isNameReserved(v.name!)) throw new Error("That name is reserved.");

  try {
    await prisma.subdomain.create({
      data: { name: v.name!, userId: session.user.id, status: "active" },
    });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null ? (e as { code?: string }).code : undefined;
    if (code === "P2002") throw new Error("Just taken. Try another.");
    throw new Error("Claim failed.");
  }

  return { ok: true, name: v.name! };
}

export async function deleteRecord(id: string, userId: string) {
  const sub = await prisma.subdomain.findUnique({ where: { id } });
  if (!sub || sub.userId !== userId) throw new Error("Not found");
  if (sub.status !== "active") throw new Error("Not active");

  try {
    await deleteAllRecordsForSubdomain(sub.name);
  } catch {
    // Best-effort DNS cleanup
  }

  await prisma.dnsRecord.deleteMany({ where: { subdomainId: id } });
  await prisma.subdomain.update({ where: { id }, data: { status: "revoked" } });
  revalidatePath("/dashboard");
}

export async function addDnsRecordAction(subdomainId: string, userId: string, input: { type: string; content: string; name: string; proxied?: boolean }) {
  const sub = await prisma.subdomain.findUnique({ where: { id: subdomainId } });
  if (!sub || sub.userId !== userId || sub.status !== "active") throw new Error("Not found");

  try {
    const cf = await createDnsRecord({
      type: input.type as "A" | "CNAME" | "TXT",
      name: input.name,
      content: input.content,
      proxied: input.proxied,
    });
    await prisma.dnsRecord.create({
      data: {
        subdomainId,
        cloudflareRecordId: cf.id,
        type: input.type,
        content: input.content,
        proxied: input.proxied ?? true,
      },
    });
  } catch (e) {
    console.error("[addDnsRecord]", e);
    throw new Error("Failed to create DNS record");
  }

  revalidatePath(`/dashboard/${sub.name}`);
}

export async function removeDnsRecord(subdomainId: string, userId: string, recordId: string) {
  const sub = await prisma.subdomain.findUnique({ where: { id: subdomainId } });
  if (!sub || sub.userId !== userId) throw new Error("Not found");

  const record = await prisma.dnsRecord.findUnique({ where: { id: recordId } });
  if (!record || record.subdomainId !== subdomainId) throw new Error("Record not found");

  try {
    if (record.cloudflareRecordId) await deleteDnsRecord(record.cloudflareRecordId);
  } catch {
    // Best-effort
  }

  await prisma.dnsRecord.delete({ where: { id: recordId } });
  revalidatePath(`/dashboard/${sub.name}`);
}

// ── Admin actions ───────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) throw new Error("Forbidden");
  return session.user;
}

export async function getAllRecords(query?: string) {
  await requireAdmin();
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { user: { email: { contains: query, mode: "insensitive" as const } } },
        ],
      }
    : undefined;
  return prisma.subdomain.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, email: true, name: true } }, records: true },
  });
}

export async function getAllUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { subdomains: true } } },
  });
}

export async function getReservedList() {
  await requireAdmin();
  const reserved = await prisma.reservedSubdomain.findMany({ orderBy: { name: "asc" } });
  return reserved.map((r) => r.name);
}

export async function getAllowlist() {
  await requireAdmin();
  const list = await prisma.adminAllowlist.findMany({ orderBy: { email: "asc" } });
  return list.map((l) => l.email);
}

export async function revokeSubdomain(name: string) {
  await requireAdmin();
  const sub = await prisma.subdomain.findUnique({ where: { name } });
  if (!sub) throw new Error("Not found");
  if (sub.status === "revoked") return;

  try {
    await deleteAllRecordsForSubdomain(sub.name);
  } catch {
    // Best-effort
  }

  await prisma.dnsRecord.deleteMany({ where: { subdomainId: sub.id } });
  await prisma.subdomain.update({ where: { id: sub.id }, data: { status: "revoked" } });
  revalidatePath("/admin");
}

export async function syncFromCloudflare() {
  await requireAdmin();

  const { listAllDnsRecords } = await import("@/lib/cloudflare");
  const { ROOT_DOMAIN } = await import("@/lib/config");

  const cfRecords = await listAllDnsRecords();
  const suffix = "." + ROOT_DOMAIN;

  // Group records by subdomain prefix
  const bySubdomain = new Map<string, typeof cfRecords>();
  for (const rec of cfRecords) {
    // Only include records that are direct children of ROOT_DOMAIN
    if (rec.name === ROOT_DOMAIN || !rec.name.endsWith(suffix)) continue;
    const prefix = rec.name.slice(0, -suffix.length);
    // Skip nested subdomains (e.g. blog.abel.subzone.dev)
    if (prefix.includes(".")) continue;
    const list = bySubdomain.get(prefix) ?? [];
    list.push(rec);
    bySubdomain.set(prefix, list);
  }

  let created = 0;
  let skipped = 0;

  for (const [name, records] of bySubdomain) {
    // Upsert the subdomain in DB (only if not already tracked)
    const existing = await prisma.subdomain.findUnique({ where: { name } });
    let subId: string;
    if (existing) {
      subId = existing.id;
      skipped++;
    } else {
      const sub = await prisma.subdomain.create({
        data: { name, userId: null, status: "active" },
      });
      subId = sub.id;
      created++;
    }

    // Sync DNS records — only add records not already in DB
    const existingRecords = await prisma.dnsRecord.findMany({
      where: { subdomainId: subId },
    });
    const existingCfIds = new Set(existingRecords.map((r) => r.cloudflareRecordId));

    for (const cf of records) {
      if (existingCfIds.has(cf.id)) continue;
      await prisma.dnsRecord.create({
        data: {
          subdomainId: subId,
          cloudflareRecordId: cf.id,
          type: cf.type,
          content: cf.content,
          proxied: cf.proxied,
        },
      });
    }
  }

  revalidatePath("/admin");
  return { ok: true, created, skipped, totalRecords: cfRecords.length };
}
