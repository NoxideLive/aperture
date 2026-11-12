## ExperimentalCombatSoundBridge

**Purpose:** Plays the experimental combat kill alert (`alarm` preview) when `experimentalAlertPrefs` combat sound is on (off by default), independent of account Sounds master switch.
**File:** `src/components/map/ExperimentalCombatSoundBridge.tsx`

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| mapId | string | yes | Open map id |
| systems | readonly MapSystemNode[] | yes | On-map systems for solar-system id filter |

### Behaviour & Interactions
- Listens for `systemNotification` / `killmail` on this map only.
- No audio unless `readExperimentalCombatAlertSound()` is true.

### Depends On
- `experimentalAlertPrefs`, `useRealtimeEvents`, `getSoundEngine`
