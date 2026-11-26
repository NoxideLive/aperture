-- Manual rollback for 0076_user_api_device.sql.
--   psql "$DATABASE_URL" -f src/db/migrations/0076_user_api_device.rollback.sql
DROP TABLE IF EXISTS "ap_user_api_device";
DROP TYPE IF EXISTS "public"."api_device_status";