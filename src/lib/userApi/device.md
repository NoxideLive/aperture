## device.ts

**Purpose:** Device-authorization flow for minting per-map user API tokens without pasting secrets into desktop apps.
**File:** `src/lib/userApi/device.ts`

### serveUserApiDeviceStart
Starts a session: stores a hashed `device_code`, returns codes and verification URIs.

### serveUserApiDeviceToken
Polls by `deviceCode` or `userCode`. Answers `authorization_pending`, `slow_down`, `expired_token`, `access_denied`, or returns the minted bearer token once.

### decideDeviceAuthorization(...)
Browser-side approve/deny; approval mints via `commitMapEvent` / `api.token_created` and holds the raw token encrypted until first poll.

### listDeviceApprovalMaps(userId)
Maps the account may authorize, filtered with `canViewMap`.

### checkDeviceIp(ip)
In-process rate limit for unauthenticated device endpoints.