'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MapSystemNode, MapViewData } from '@/types';
import { pilotCountStandingTone, pilotNameToneClass } from '@/lib/experimentalPilotPresence';
import { formatAgoFromMs } from '@/lib/map/relativeTime';

export function ExperimentalPilotsPanel({
  viewData,
  onHoverSystem,
}: {
  viewData: MapViewData;
  onHoverSystem?: (mapSystemId: string | null) => void;
}) {
  const bySystem = useMemo(() => {
    const map = new Map<string, typeof viewData.presence>();
    for (const p of viewData.presence) {
      const ms = viewData.systems.find((s) => s.systemId === p.systemId);
      if (!ms) continue;
      const list = map.get(ms.id) ?? [];
      list.push(p);
      map.set(ms.id, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [viewData]);

  if (bySystem.length === 0) {
    return <div className="p-3 text-xs text-muted-foreground">No pilots on the chain.</div>;
  }

  return (
    <ul className="divide-y text-xs">
      {bySystem.map(([mapSystemId, pilots]) => (
        <SystemPilotGroup
          key={mapSystemId}
          mapSystemId={mapSystemId}
          system={viewData.systems.find((s) => s.id === mapSystemId)!}
          pilots={pilots}
          onHoverSystem={onHoverSystem}
        />
      ))}
    </ul>
  );
}

function SystemPilotGroup({
  mapSystemId,
  system,
  pilots,
  onHoverSystem,
}: {
  mapSystemId: string;
  system: MapSystemNode;
  pilots: MapViewData['presence'];
  onHoverSystem?: (id: string | null) => void;
}) {
  return (
    <li
      onMouseEnter={() => onHoverSystem?.(mapSystemId)}
      onMouseLeave={() => onHoverSystem?.(null)}
    >
      <div className="bg-muted/40 px-2 py-1 font-medium">
        {system.alias ?? system.name}
        <span className="text-muted-foreground"> ({pilots.length})</span>
      </div>
      <ul>
        {pilots.map((p) => (
          <li key={p.characterId} className="flex gap-2 px-2 py-1">
            <span className={pilotNameToneClass(pilotCountStandingTone(1))}>{p.characterName}</span>
            <span className="truncate text-muted-foreground">{p.shipTypeName ?? '—'}</span>
            <PilotLocationAgo locationAt={p.locationAt} />
          </li>
        ))}
      </ul>
    </li>
  );
}

function PilotLocationAgo({ locationAt }: { locationAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const ts = Date.parse(locationAt);
  const ms = Number.isNaN(ts) ? 0 : now - ts;
  return <span className="ml-auto text-muted-foreground">{formatAgoFromMs(ms)}</span>;
}
