## ExperimentalThemeToggle

**Purpose:** Map-toolbar menu to switch experimental UI theme (`aperture` / `slate` / `light` / `classic`) without opening Account settings.
**File:** `src/components/map/ExperimentalThemeToggle.tsx`

Renders only when mounted under experimental UI (caller gates visibility). Writes via `useExperimentalUi()`.
