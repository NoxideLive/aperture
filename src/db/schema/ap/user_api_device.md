## user_api_device.ts

**Purpose:** The `ap_user_api_device` table — short-lived device-authorization sessions for minting per-map user API tokens without pasting a secret into a desktop app.
**File:** `src/db/schema/ap/user_api_device.ts`

### apUserApiDevice

`pgTable('ap_user_api_device', …)`:

| Column | Role |
|---|---|
| `device_code_hash` | sha256 hex of the opaque `device_code` the client polls with |
| `user_code` | Human-readable code shown on the approval page (`XXXX-XXXX`) |
| `client` | Registered third-party client id (`eves-little-copilot`) |
| `requested_scopes` | Scopes the client asked for |
| `status` | `pending` → `approved` / `denied` / `expired` / `consumed` |
| `poll_interval_sec` | Minimum seconds between poll attempts |
| `minted_token_enc` | AES-wrapped raw `apu_` token between approval and first poll (cleared on consume) |
| `expires_at` | Session expiry; pending rows past this become `expired` |
| `approved_at` / `denied_at` / `consumed_at` / `last_poll_at` | Lifecycle timestamps; `last_poll_at` enforces minimum poll spacing |
| `user_id` | Approver's account (`ON DELETE SET NULL`) |
| `map_id` | Map chosen on approval |
| `approved_by_character_id` | Character that approved (`ON DELETE SET NULL`) |
| `minted_token_id` | FK to the `ap_map_api_token` row minted on approval |
| `created_at` | Row creation time |

Index `ap_user_api_device_expires_at_idx` on `expires_at` for the cleanup job.