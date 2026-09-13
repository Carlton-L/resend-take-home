CREATE TYPE "public"."claim_status" AS ENUM('pending', 'verified', 'at_risk', 'contested', 'revoked');--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"registrable_domain" text NOT NULL,
	"token" text NOT NULL,
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "claims_owned_name_idx" ON "claims" USING btree ("name") WHERE status in ('verified', 'at_risk', 'contested');--> statement-breakpoint
CREATE INDEX "claims_owner_idx" ON "claims" USING btree ("owner_id","issued_at");--> statement-breakpoint
CREATE INDEX "claims_name_idx" ON "claims" USING btree ("name");