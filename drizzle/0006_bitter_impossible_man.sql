ALTER TABLE "claims" ADD COLUMN "last_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "dns_host" text;