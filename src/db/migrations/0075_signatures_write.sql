-- Add the per-map user API write scope for probe-scanner paste uploads.
--
-- Rollback: src/db/migrations/0075_signatures_write.rollback.sql.

ALTER TYPE "public"."api_scope" ADD VALUE IF NOT EXISTS 'signatures_write';--> statement-breakpoint