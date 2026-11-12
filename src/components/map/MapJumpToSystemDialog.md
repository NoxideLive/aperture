## MapJumpToSystemDialog

**Purpose:** Experimental command-palette jump: filter visible map systems and center the canvas on the selection.
**File:** `src/components/map/MapJumpToSystemDialog.tsx`

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| open | boolean | yes | Dialog open state |
| onOpenChange | (open: boolean) => void | yes | Open setter |
| systems | readonly MapSystemNode[] | yes | On-map systems to search |
| onJump | (mapSystemId: string) => void | yes | Pan + select the picked node |
