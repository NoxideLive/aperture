## ExperimentalRallyNotify

**Purpose:** When experimental UI is on and the user opts in, surfaces a rally point via in-app toast and/or a granted browser `Notification` (each off by default; `experimentalAlertPrefs`).
**File:** `src/components/map/ExperimentalRallyNotify.tsx`

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| mapId | string | yes | Open map id for envelope filtering |

### Behaviour & Interactions
- Listens for `mapUpdate` / `system.updated` with non-null `rallyAt`; clearing a rally is silent.
- Toast and desktop notification are independent; neither fires unless its account setting is on.
- Desktop notification is best-effort (only when permission is already `granted`).

### Depends On
- `useRealtimeEvents`, `mapUpdateLoadSchema`, `sonner` toast.
