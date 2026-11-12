## experimentalQolPrefs.ts

**Purpose:** Device-local experimental QoL toggles (legacy UI ignores all reads).
**File:** `src/lib/experimentalQolPrefs.ts`

### Preferences (localStorage)
- `readKeepMapSelection` / `writeKeepMapSelection` — pane click does not clear selected system.
- `readExperimentalPointerCursor` / `writeExperimentalPointerCursor` — sets `data-pointer-cursor` on `<html>` (default on).
- `readPastePreviewOnCtrlV` / `writePastePreviewOnCtrlV` — Ctrl+V opens signature paste dialog instead of fast path.

Dispatches `aperture:experimental-qol-prefs` on write.
