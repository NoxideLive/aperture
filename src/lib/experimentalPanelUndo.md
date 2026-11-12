## experimentalPanelUndo.ts

**Purpose:** In-memory per-panel undo stacks for the experimental UI (map, signatures, routes, inspector).
**File:** `src/lib/experimentalPanelUndo.ts`

---

### experimentalUndoPush(panel, cmd)
Pushes a command onto the panel stack (clears that panel's redo branch). Caps depth at `EXPERIMENTAL_UNDO_MAX` (50).

### experimentalUndoApply(panel) / experimentalRedoApply(panel)
Pops and runs `undo` / `redo`. Returns whether an action ran.

### experimentalUndoPanelFromFocus()
Maps the focused DOM node's `data-panel-id` to a stack id (`canvas` → `map`, etc.).
