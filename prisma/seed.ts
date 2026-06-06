/**
 * Seed script — run after first deploy to create admin users.
 *
 * Usage:
 *   npx tsx prisma/seed.ts you@example.com another@example.com
 *
 * Or set BOOTSTRAP_ADMIN_EMAILS in .env and the auth system will
 * auto-promote on first GitHub sign-in.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const emails = process.argv.slice(2);
  if (emails.length === 0) {
    console.log("Usage: npx tsx prisma/seed.ts <email1> <email2> ...");
    console.log("These emails will be added to the admin allowlist.");
    process.exit(1);
  }

  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email.includes("@")) {
      console.log(`Skipping invalid email: ${raw}`);
      continue;
    }

    await prisma.adminAllowlist.upsert({
      where: { email },
      update: {},
      create: { email, addedBy: "seed-script" },
    });
    console.log(`✓ ${email} added to admin allowlist`);
  }

  console.log("\nDone. Users signing in with these emails via GitHub will be auto-promoted to admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
