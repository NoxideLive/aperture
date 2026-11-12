'use client';

import { useMemo } from 'react';
import type { MapActiveRouteView, MapViewData } from '@/types';
import { Button } from '@/components/ui/button';
import { systemSecurityColor } from '@/components/map/styling';

export function CurrentRoutePanel({
  activeRoute,
  viewData,
  onSetRoute,
}: {
  activeRoute: MapActiveRouteView | null;
  viewData: MapViewData;
  onSetRoute?: () => void;
}) {
  const presenceByChar = useMemo(() => {
    const m = new Map<number, MapViewData['presence'][number]>();
    for (const p of viewData.presence) m.set(p.characterId, p);
    return m;
  }, [viewData.presence]);

  if (!activeRoute) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        No active route. Plan a route and choose <strong>Set route</strong> to push ESI waypoints (k-space
        legs only).
      </div>
    );
  }
  const onMap = activeRoute.hops.filter((h) => h.onMap);
  return (
    <div className="flex flex-col gap-2 p-3 text-sm">
      <div className="font-heading font-medium">
        → {activeRoute.destinationName}
        <span className="ml-2 text-xs text-muted-foreground">
          {activeRoute.followerCharacterIds.length} follower(s)
        </span>
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {activeRoute.followerCharacterIds.map((cid) => {
          const p = presenceByChar.get(cid);
          const sys = p
            ? viewData.systems.find((s) => s.systemId === p.systemId)?.alias ??
              viewData.systems.find((s) => s.systemId === p.systemId)?.name
            : null;
          return (
            <li key={cid} className="flex gap-2">
              <span className="text-foreground">{p?.characterName ?? `Char ${cid}`}</span>
              <span className="truncate">{sys ?? '—'}</span>
            </li>
          );
        })}
      </ul>
      <MotionStrip hops={onMap} />
      {onSetRoute ? (
        <Button type="button" size="sm" className="self-start" onClick={onSetRoute}>
          Set route / refresh waypoints
        </Button>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Waypoint cursor: {activeRoute.waypointCursor + 1} / {activeRoute.hops.length}
      </p>
    </div>
  );
}

function MotionStrip({ hops }: { hops: MapActiveRouteView['hops'] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {hops.map((h, i) => (
        <span
          key={`${h.systemId}-${i}`}
          className="rounded px-1 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: systemSecurityColor(h.security, h.securityStatus),
            color: '#fff',
          }}
          title={h.name}
        >
          {h.tag ?? h.name.slice(0, 6)}
        </span>
      ))}
    </div>
  );
}
