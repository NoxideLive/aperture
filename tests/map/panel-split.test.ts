import { describe, expect, it } from 'vitest';
import {
  parsePanelSplitDroppableId,
  panelSplitDroppableId,
  splitPanelAdjacent,
} from '@/lib/map/layout/panelSplit';
import { migrateLayout, DEFAULT_MAP_LAYOUT } from '@/lib/map/layout/panels';

describe('panelSplit', () => {
  it('round-trips split droppable ids', () => {
    const id = panelSplitDroppableId('intel', 'r');
    expect(parsePanelSplitDroppableId(id)).toEqual({ groupId: 'intel', side: 'r' });
  });

  it('places a torn-off tab beside the target group', () => {
    const base = migrateLayout(DEFAULT_MAP_LAYOUT);
    const next = splitPanelAdjacent(base, 'lg', 'route', 'inspector', 'b');
    expect(next.groups.lg.some((g) => g.members.includes('route'))).toBe(true);
    expect(next.layouts.lg.some((i) => i.i === 'route')).toBe(true);
  });
});
