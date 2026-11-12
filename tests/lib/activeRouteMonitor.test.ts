import { describe, expect, it } from 'vitest';
import {
  activeRouteConnectionIds,
  activeRouteHopSystemIds,
  followersOffRoute,
  isOnActiveRoute,
} from '@/lib/map/activeRouteMonitor';
import type { RouteHop } from '@/types';

const hops: RouteHop[] = [
  {
    systemId: 1,
    name: 'A',
    security: '0.9',
    securityStatus: 0.9,
    via: 'origin',
    connectionId: null,
    onMap: true,
    tag: null,
    viaSigId: null,
  },
  {
    systemId: 2,
    name: 'B',
    security: '-1',
    securityStatus: -1,
    via: 'wh',
    connectionId: 42,
    onMap: true,
    tag: 'A',
    viaSigId: 'AUQ',
  },
  {
    systemId: 3,
    name: 'C',
    security: '0.5',
    securityStatus: 0.5,
    via: 'gate',
    connectionId: null,
    onMap: false,
    tag: null,
    viaSigId: null,
  },
];

describe('activeRouteMonitor', () => {
  it('collects hop system ids', () => {
    expect([...activeRouteHopSystemIds(hops)]).toEqual([1, 2, 3]);
    expect(isOnActiveRoute(hops, 2)).toBe(true);
    expect(isOnActiveRoute(hops, 99)).toBe(false);
  });

  it('collects wormhole connection ids', () => {
    expect(activeRouteConnectionIds(hops)).toEqual(['42']);
  });

  it('lists off-route followers', () => {
    const off = followersOffRoute(
      hops,
      [
        {
          characterId: 10,
          characterName: 'Pilot',
          userId: 1,
          mainCharacterId: 10,
          mainCharacterName: 'Pilot',
          systemId: 99,
          systemName: 'Off',
          systemSecurity: null,
          systemTrueSec: null,
          shipTypeId: null,
          shipTypeName: null,
          shipClass: null,
          shipName: null,
          locationAt: new Date().toISOString(),
        },
      ],
      [10],
    );
    expect(off).toHaveLength(1);
    expect(off[0]!.systemId).toBe(99);
  });
});
