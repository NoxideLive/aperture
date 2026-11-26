## route.ts (signatures/paste)

**Purpose:** `POST /api/v1/signatures/paste` — bearer-authenticated lazy-delete signature paste for external tools.
**File:** `src/app/api/v1/signatures/paste/route.ts`

**Scope:** `signatures_write` (token and map must both grant it).

**Body:** `{ systemId: number, text: string }`.

**Success:** `{ ok: true, data: { added, updated, removed, connectionsRemoved }, generatedAt }`.

**Depends on:** `userApiMutationRoute`, `serveUserApiSignaturePaste`.