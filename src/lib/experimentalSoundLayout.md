## experimentalSoundLayout.ts

**Purpose:** Parses and updates per-map system sound-mute state stored under `MapLayoutConfig.panelSettings.sound`.
**File:** `src/lib/experimentalSoundLayout.ts`

---

### parseExperimentalSoundLayoutSettings(layout: MapLayoutConfig): ExperimentalSoundLayoutSettings
Reads `panelSettings.sound`, including optional `byMap` (map id → map system id → mute) and `followSelectedPilot`.

### mutedSystemsForMap(settings, mapId)
Returns the mute table for one map.

### isSystemSoundMuted(muted, mapSystemId, event): boolean
True when the system is fully muted or the event is individually muted.

### isSystemMutedForDisplay(muted, mapSystemId): boolean
True when any mute applies (full or per-event).

### setSystemMuteAll / toggleSystemMuteEvent
Immutable updaters for layout persistence.

### mergeSoundPanelSettings(layout, sound)
Writes the sound settings blob back onto a layout config.

### SOUND_EVENT_MENU_LABELS
Human labels for each `SoundEvent` used in context menus.
