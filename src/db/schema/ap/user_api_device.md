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
| `minted_token_enc` | AES-wrapped raw `apu_` token between approval and first poll |