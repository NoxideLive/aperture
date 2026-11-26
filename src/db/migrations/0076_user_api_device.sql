-- OAuth-style device authorization for minting per-map user API tokens.
--
-- Rollback: src/db/migrations/0076_user_api_device.rollback.sql.

CREATE TYPE "public"."api_device_status" AS ENUM('pending', 'approved', 'denied', 'expired', 'consumed');--> statement-breakpoint
CREATE TABLE "ap_user_api_device" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"device_code_hash" text NOT NULL,
	"user_code" text NOT NULL,
	"client" text NOT NULL,
	"requested_scopes" "api_scope"[] NOT NULL,
	"status" "api_device_status" DEFAULT 'pending' NOT NULL,
	"poll_interval_sec" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"approved_at" timestamp with time zone,
	"denied_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"last_poll_at" timestamp with time zone,
	"user_id" integer,
	"map_id" bigint,
	"approved_by_character_id" bigint,
	"minted_token_id" bigint,
	"minted_token_enc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ap_user_api_device_device_code_hash_unique" UNIQUE("device_code_hash"),
	CONSTRAINT "ap_user_api_device_user_code_unique" UNIQUE("user_code")
);--> statement-breakpoint
ALTER TABLE "ap_user_api_device" ADD CONSTRAINT "ap_user_api_device_user_id_ap_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ap_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ap_user_api_device" ADD CONSTRAINT "ap_user_api_device_map_id_ap_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."ap_map"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ap_user_api_device" ADD CONSTRAINT "ap_user_api_device_approved_by_character_id_ap_character_id_fk" FOREIGN KEY ("approved_by_character_id") REFERENCES "public"."ap_character"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ap_user_api_device" ADD CONSTRAINT "ap_user_api_device_minted_token_id_ap_map_api_token_id_fk" FOREIGN KEY ("minted_token_id") REFERENCES "public"."ap_map_api_token"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ap_user_api_device_user_code_idx" ON "ap_user_api_device" USING btree ("user_code");--> statement-breakpoint
CREATE INDEX "ap_user_api_device_expires_at_idx" ON "ap_user_api_device" USING btree ("expires_at");