## experimentalAlertPrefs.ts

**Purpose:** Device-local toggles for experimental UI sounds and notifications introduced in the build (all off by default).
**File:** `src/lib/experimentalAlertPrefs.ts`

### Preferences (localStorage)
- `readExperimentalRallyToast` / `writeExperimentalRallyToast` — in-app rally toast.
- `readExperimentalRallyDesktopNotification` / `writeExperimentalRallyDesktopNotification` — browser `Notification` for rally.
- `readExperimentalCombatAlertSound` / `writeExperimentalCombatAlertSound` — combat chime (hook point; off until wired).
- `readExperimentalCombatAlertDesktop` / `writeExperimentalCombatAlertDesktop` — combat desktop notification (hook point).
- `readExperimentalRouteOffRouteToast` / `writeExperimentalRouteOffRouteToast` — follower left the active route hop list.
- `readExperimentalRouteHazardToast` / `writeExperimentalRouteHazardToast` — wormhole on the route critical EOL or deleted.

Dispatches `aperture:experimental-alert-prefs` on write. Legacy UI and experimental-off always read `false`.
