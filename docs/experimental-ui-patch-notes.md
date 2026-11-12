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

## Panels (BUILD 2)

- Default layout uses tab groups: Inspector+Intel, Routes (+ Current Route), Killboard+Kill stats, Thera+D-Scan search, System graph+Tags, Structures; signatures stay full-width under the map.
- Dedicated **Pilots**, **Kills**, **D-Scan**, and **Current Route** panels in the registry and experimental default layout.
- Empty Inspector shows a **chain summary** (systems, pilots, EOL links).
- Routes panel highlights the first reachable path on the map (cyan glow on WH links).
- Per-panel **+ Add** header actions (see `docs/aperture-panel-actions.md`) and matching command-palette entries.
- **Signature clean up** dialog (toolbar + signatures panel header + palette): chain or selected-system scope, filter preview, preferences saved in layout `panelSettings.signatures`.
- Layout presets (**Scanning**, **Combat**, **Travel**) in the toolbar Panels menu; `layoutPreset` stored in saved layout.
- Panel merge targets pulse while dragging tabs; larger tab drag ghost and tear-off drop zone label.
- Per-panel undo stacks and **Ctrl+Z / Ctrl+Shift+Z** on the focused panel (in-memory).
- Account settings (experimental): **Device** scope badges and search filter on experimental sections.

## Routes (BUILD 2 data)

- Per-map route favourites and **active route** row (`ap_map_active_route`) with multi-waypoint ESI sequence push.
- **Current Route** panel for the saved hop list.

## Not persisted yet

- Undo stacks across reload (in-memory only).
- See `docs/plans/build2-blocked-proposals.md` for staging systems and other deferred schema items.
