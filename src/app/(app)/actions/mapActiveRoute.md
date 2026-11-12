## mapActiveRoute.ts

**Purpose:** Server actions for experimental per-map active route sessions (owner-only).
**File:** `src/app/(app)/actions/mapActiveRoute.ts`

---

### setMapActiveRouteInputSchema
Re-exported from `@/lib/map/mapActiveRouteSchema` for unit tests.

### setMapActiveRouteAction(input)
Replaces any existing active route for the viewer on the map; stores plan hops and follower character ids.

### clearMapActiveRouteAction(input)
Deletes the viewer's active route row for the map.
