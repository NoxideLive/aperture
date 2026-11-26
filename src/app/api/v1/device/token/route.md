## route.ts (device/token)

**Purpose:** `POST /api/v1/device/token` — poll a device session or pick up a one-time minted bearer token.
**File:** `src/app/api/v1/device/token/route.ts`

**Body:** `{ deviceCode }` or `{ userCode }` after browser approval.

**Depends on:** `userApiPublicRoute`, `serveUserApiDeviceToken`.