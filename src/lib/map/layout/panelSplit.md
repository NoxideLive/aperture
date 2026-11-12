## panelSplit.ts

**Purpose:** Experimental panel-drag split targets — parse droppable ids and place a torn-off tab in a new grid cell beside a group.
**File:** `src/lib/map/layout/panelSplit.ts`

### panelSplitDroppableId(groupId, side)
Returns the dnd-kit droppable id (`split:grp:<groupId>:l|r|t|b`).

### parsePanelSplitDroppableId(overId)
Parses a split droppable id; returns null when `overId` is not a split target.

### splitPanelAdjacent(config, bp, panel, targetGroupId, side)
Removes `panel` from its source group (re-keying the anchor when needed), then appends a singleton group + layout item adjacent to `targetGroupId` on `side` for breakpoint `bp`.
