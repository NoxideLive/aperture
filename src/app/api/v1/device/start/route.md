## route.ts (device/start)

**Purpose:** `POST /api/v1/device/start` — unauthenticated start of a device authorization session.
**File:** `src/app/api/v1/device/start/route.ts`

**Body:** `{ client: 'eves-little-copilot', scopes: ApiScope[] }`.

**Depends on:** `userApiPublicRoute`, `serveUserApiDeviceStart`.