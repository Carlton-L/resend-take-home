CREATE TABLE "check_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "check_attempts" ADD CONSTRAINT "check_attempts_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_attempts_created_at_idx" ON "check_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "check_attempts_owner_idx" ON "check_attempts" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "check_attempts_claim_idx" ON "check_attempts" USING btree ("claim_id","created_at");