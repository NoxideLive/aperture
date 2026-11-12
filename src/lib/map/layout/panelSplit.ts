import { PANEL_COLS, PANEL_MIN } from '@/lib/map/layout/panels';
import type { Breakpoint, MapLayoutConfig, PanelGroup, PanelId } from '@/types';

export type PanelSplitSide = 'l' | 'r' | 't' | 'b';

const SPLIT_PREFIX = 'split:grp:';

/** dnd-kit droppable id for an edge split target on a group header. */
export function panelSplitDroppableId(groupId: string, side: PanelSplitSide): string {
  return `${SPLIT_PREFIX}${groupId}:${side}`;
}

export function parsePanelSplitDroppableId(
  overId: string,
): { groupId: string; side: PanelSplitSide } | null {
  if (!overId.startsWith(SPLIT_PREFIX)) return null;
  const rest = overId.slice(SPLIT_PREFIX.length);
  const sep = rest.lastIndexOf(':');
  if (sep <= 0) return null;
  const groupId = rest.slice(0, sep);
  const side = rest.slice(sep + 1);
  if (side !== 'l' && side !== 'r' && side !== 't' && side !== 'b') return null;
  return { groupId, side };
}

function removePanelFromGroups(
  groups: PanelGroup[],
  panel: PanelId,
): { groups: PanelGroup[]; droppedGroupIds: Set<string>; renamed: Map<string, PanelId> } {
  const droppedGroupIds = new Set<string>();
  const renamed = new Map<string, PanelId>();
  const out: PanelGroup[] = [];
  for (const g of groups) {
    if (!g.members.includes(panel)) {
      out.push(g);
      continue;
    }
    const remaining = g.members.filter((m) => m !== panel);
    if (remaining.length === 0) {
      droppedGroupIds.add(g.id);
      continue;
    }
    const newActive = g.active === panel ? remaining[0]! : g.active;
    if (g.id === panel) {
      const newId = newActive;
      renamed.set(g.id, newId);
      out.push({ id: newId, members: remaining, active: newActive });
    } else {
      out.push({ ...g, members: remaining, active: newActive });
    }
  }
  return { groups: out, droppedGroupIds, renamed };
}

/**
 * Tear a tab out of its group and place it in a new singleton cell adjacent to
 * `targetGroupId` on the given edge (active breakpoint only).
 */
export function splitPanelAdjacent(
  config: MapLayoutConfig,
  bp: Breakpoint,
  panel: PanelId,
  targetGroupId: string,
  side: PanelSplitSide,
): MapLayoutConfig {
  const source = config.groups[bp].find((g) => g.members.includes(panel));
  const targetItem = config.layouts[bp].find((it) => it.i === targetGroupId);
  if (!source || !targetItem) return config;

  const { groups: groupsAfterRemove, droppedGroupIds, renamed } = removePanelFromGroups(
    config.groups[bp],
    panel,
  );

  const cols = PANEL_COLS[bp];
  const { minW, minH } = PANEL_MIN[panel];
  const w = Math.min(cols, minW);
  const h = minH;

  let x = targetItem.x;
  let y = targetItem.y;
  switch (side) {
    case 'l':
      x = Math.max(0, targetItem.x - w);
      break;
    case 'r':
      x = Math.min(cols - w, targetItem.x + targetItem.w);
      break;
    case 't':
      y = Math.max(0, targetItem.y - h);
      break;
    case 'b':
      y = targetItem.y + targetItem.h;
      break;
    default: {
      const _exhaustive: never = side;
      return _exhaustive;
    }
  }

  let layoutsBp = config.layouts[bp]
    .filter((it) => !droppedGroupIds.has(it.i))
    .map((it) => {
      const newId = renamed.get(it.i);
      return newId ? { ...it, i: newId, ...PANEL_MIN[newId] } : it;
    });

  layoutsBp = [...layoutsBp, { i: panel, x, y, w, h, minW, minH }];
  const groupsBp = [...groupsAfterRemove, { id: panel, members: [panel], active: panel }];

  return {
    ...config,
    groups: { ...config.groups, [bp]: groupsBp },
    layouts: { ...config.layouts, [bp]: layoutsBp },
  };
}
