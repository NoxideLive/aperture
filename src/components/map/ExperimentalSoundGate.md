## ExperimentalSoundGate.tsx

**Purpose:** Experimental per-system sound-mute gate for map sound bridges and layout-driven mute state.
**File:** `src/components/map/ExperimentalSoundGate.tsx`

### ExperimentalSoundGateProvider
**Props:** `mapId`, `settings` (`ExperimentalSoundLayoutSettings`), `systems`, `children`.

Exposes mute lookup from `panelSettings.sound` for the open map.

### useExperimentalSoundGate()
Returns the gate context or `null` outside the provider.

### shouldPlaySystemSound(gate, mapSystemId, event)
Returns whether playback should proceed.
