## index.ts

**Purpose:** Schema barrel — re-exports every `universe_*` table and the effective-dogma view for the Drizzle client and migration tooling.
**File:** `src/db/schema/index.ts`

Re-exports `universe/{geography,items,dogma,statics,views,sovereignty}`, `ap/{enums,instance,access_grant,user,character}`, the map schema `ap/{map,map_system,map_note,map_connection,map_signature,map_event,event_kind}`, and `ap/{system_stats,error_log,metric_snapshot,job_run,map_character_tracking,map_tracking_seed,webhook,corporation,alliance,role,structure,structure_event,integration_token,character_presence,map_share,map_api_token,user_api_device}`. Imported as `* as schema` by `src/db/client.ts` and globbed by `drizzle.config.ts`.

`ap_user_api_device` (migration 0076) holds device-authorization sessions for the `/api/v1/device/*` flow; see `src/db/schema/ap/user_api_device.md`.
