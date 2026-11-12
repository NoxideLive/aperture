import type { MapConnectionEdge, MapPresenceEntry, RouteHop } from '@/types';

/** EVE system ids on the stored hop list. */
export function activeRouteHopSystemIds(hops: RouteHop[]): Set<number> {
  return new Set(hops.map((h) => h.systemId));
}

export function isOnActiveRoute(hops: RouteHop[], systemId: number): boolean {
  return activeRouteHopSystemIds(hops).has(systemId);
}

/** `ap_map_connection.id` strings referenced by wormhole hops. */
export function activeRouteConnectionIds(hops: RouteHop[]): string[] {
  const out: string[] = [];
  for (const h of hops) {
    if (h.connectionId == null) continue;
    const id = String(h.connectionId);
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function followersOffRoute(
  hops: RouteHop[],
  presence: MapPresenceEntry[],
  followerCharacterIds: number[],
): { characterId: number; characterName: string; systemId: number }[] {
  const onRoute = activeRouteHopSystemIds(hops);
  const follow = new Set(followerCharacterIds);
  const out: { characterId: number; characterName: string; systemId: number }[] = [];
  for (const p of presence) {
    if (!follow.has(p.characterId)) continue;
    if (onRoute.has(p.systemId)) continue;
    out.push({
      characterId: p.characterId,
      characterName: p.characterName,
      systemId: p.systemId,
    });
  }
  return out;
}

export function routeConnectionsById(
  hops: RouteHop[],
  connections: MapConnectionEdge[],
): Map<string, MapConnectionEdge> {
  const ids = new Set(activeRouteConnectionIds(hops));
  const map = new Map<string, MapConnectionEdge>();
  for (const c of connections) {
    if (ids.has(c.id)) map.set(c.id, c);
  }
  return map;
}
