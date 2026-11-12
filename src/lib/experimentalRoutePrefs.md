## experimentalRoutePrefs.ts

**Purpose:** Device-local experimental route planner toggles (exit origin, jump-bridge overlay).
**File:** `src/lib/experimentalRoutePrefs.ts`

### readExperimentalExitOrigin() / writeExperimentalExitOrigin(v)
Persist `chain` vs `selected` as the origin when comparing exit routes and resolving shortcuts. Inactive when experimental UI is off.

### readExperimentalIncludeJumpBridge() / writeExperimentalIncludeJumpBridge(on)
Whether mapped jump-bridge edges participate in route compute; default on. Merged into the `prefs` sent to `route-plan` only (not stored on `ap_user`).

### subscribeExperimentalRoutePrefs(onChange)
Listens for `aperture:experimental-route-prefs` on `window` after writes.
