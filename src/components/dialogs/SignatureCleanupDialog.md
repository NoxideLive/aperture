## SignatureCleanupDialog

**Purpose:** Experimental signature bulk-delete preview with chain or selected-system scope.
**File:** `src/components/dialogs/SignatureCleanupDialog.tsx`

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| open | boolean | yes | Dialog visibility |
| settings / onSettingsChange | SignatureCleanupPanelSettings | yes | Filter state persisted via map layout `panelSettings.signatures` |
| onDeleteSignatures | (ids: string[]) => void | yes | Commits deletes (caller handles subchain prompts) |

### Behaviour & Interactions

- Combines `signatureCleanupFilters` with optional stale-system narrowing via `signatureCleanupStaleness` and account indicator prefs.
- On open, selects all matched rows by default.
