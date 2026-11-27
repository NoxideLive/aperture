## device.ts

**Purpose:** Device-authorization flow for minting per-map user API tokens without pasting secrets into desktop apps.
**File:** `src/lib/userApi/device.ts`

### serveUserApiDeviceStart
Starts a session: stores a hashed `device_code`, returns codes and verification URIs.

### serveUserApiDeviceToken
Polls by `deviceCode` only (RFC 8628). Answers `authorization_pending`, `slow_down` (429 with `retryAfterSec`), `expired_token`, `access_denied`, or returns the minted bearer token once on the first successful poll, then marks the session `consumed`.

### decideDeviceAuthorization(...)
Browser-side approve or deny. Deny always transitions a pending session to `denied`. Approval mints via `commitMapEvent` / `api.token_created`, stores the encrypted raw token on the row, immediately consumes it for the browser response, and returns the raw token once for manual copy (competing with the client's poll on the same single-use consume).

### listDeviceApprovalMaps(userId)
Maps the account may authorize, filtered with `canViewMap`.

### checkDeviceIp(ip)
In-process rate limit for unauthenticated device endpoints.