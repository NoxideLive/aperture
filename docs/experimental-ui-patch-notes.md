# Experimental UI patch notes

All features below require the experimental UI (`ap_ui` cookie). Legacy UI is unchanged.

## Map & links

- Link importance styling, home-path brightening, hover dim and endpoint glow.
- Size badges and EOL purple outline: separate **EOL (~4h)** static outline vs **EOL critical (~1h)** slow pulse; critical mass red on the line stays louder.
- Pointer-cursor default (toggle in Account settings).

## Themes

- Four themes: Aperture default (`exp-dark`, neutral legacy chrome), Slate (`exp-slate`, blue), Light, Classic (Pathfinder map colours).
- Theme toggle on the map toolbar and in the command palette.

## Pilots & alerts

- Pilot standing badge tint and shared hover delay on pilot cards (Account **Hover delay**, default 100 ms).
- Combat ring (10 m) and rally notifications — **off by default**; opt in under Account → Experimental alerts (toast, desktop, combat sound).

## QoL

- Keep selection on paste (toggle), Ctrl+Shift+V paste when map focused, link hover delay coordinated with account setting.
- Command palette: jump to system, theme switches, experimental toggles.
- Paste preview dialog and auto mass-from-log (off by default).

## Panels (BUILD 2 slice)

- Default layout uses tab groups: Inspector+Intel, Routes, Killboard+Kill stats, Thera+D-Scan search, System graph+Tags, Structures; signatures stay full-width under the map.
- Empty Inspector shows a **chain summary** (systems, pilots, EOL links).
- Routes panel highlights the first reachable path on the map (cyan glow on WH links).
- Per-panel undo stacks and **Ctrl+Z / Ctrl+Shift+Z** on the focused panel (in-memory; map/signatures wiring grows incrementally).
- Panel merge targets pulse while dragging tabs; grid ghost shows tear-off placement.

## Not in this branch yet

See `docs/plans/build2-blocked-proposals.md` for active routes, staging, per-map route pins, dedicated Pilots/Kills/D-Scan/Current Route panels, full signature cleanup UI, and persisted undo.
