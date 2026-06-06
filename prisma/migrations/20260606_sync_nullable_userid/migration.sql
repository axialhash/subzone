-- AlterTable: Make Subdomain.userId nullable for CF→DB sync
-- Sync-created subdomains have no owner (created outside the platform)

ALTER TABLE "Subdomain" DROP CONSTRAINT "Subdomain_userId_fkey";

ALTER TABLE "Subdomain" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Subdomain" ADD CONSTRAINT "Subdomain_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
