## ExperimentalRallyNotify

**Purpose:** When experimental UI is on, surfaces a rally point being set via in-app toast and a granted browser `Notification`.
**File:** `src/components/map/ExperimentalRallyNotify.tsx`

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| mapId | string | yes | Open map id for envelope filtering |

### Behaviour & Interactions
- Listens for `mapUpdate` / `system.updated` with non-null `rallyAt`; clearing a rally is silent.
- Desktop notification is best-effort (only when permission is already `granted`).

### Depends On
- `useRealtimeEvents`, `mapUpdateLoadSchema`, `sonner` toast.
