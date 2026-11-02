## CharacterSortList

**Purpose:** Vertical drag-to-reorder list for an account's characters.
**File:** `src/components/chrome/CharacterSortList.tsx`

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| items | `T[]` (`T` has `id: string`) | yes | Rows in current order |
| onReorder | `(next: T[]) => void` | yes | Fired after a completed drag with the new order |
| renderItem | `(item: T) => ReactNode` | yes | Row contents beside the grip |

### Renders
A grip handle and the caller-supplied row, stacked vertically.

### Behaviour & Interactions
- Pointer drag starts after a short movement so clicks inside the row still register.
- `onReorder` runs only when the row lands on a different index.
