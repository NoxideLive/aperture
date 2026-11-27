## mint.ts

**Purpose:** Shared per-map user API token minting for web settings and device approval.
**File:** `src/lib/userApi/mint.ts`

### accountMainCanUseMap(userId, mapId)
Whether the account's main is active, may view the map, and passes the login gate.

### mintMapApiTokenInTx(tx, fields, now)
Cap and scope checks under an account `FOR UPDATE` lock, then inserts `ap_map_api_token`.

### mintMapApiTokenForAccount(args)
Generates a bearer token, commits `api.token_created`, returns the raw token once.