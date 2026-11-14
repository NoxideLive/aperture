'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { MapSystemNode } from '@/lib/map/loadMap';
import type { SoundEvent } from '@/lib/sounds/prefs';
import {
  isSystemSoundMuted,
  type ExperimentalSoundLayoutSettings,
} from '@/lib/experimentalSoundLayout';

type ExperimentalSoundGateValue = {
  isMuted: (mapSystemId: string, event: SoundEvent) => boolean;
  mapSystemIdForEve: (eveSystemId: number) => string | null;
  settings: ExperimentalSoundLayoutSettings;
};

const ExperimentalSoundGateContext = createContext<ExperimentalSoundGateValue | null>(null);

export function ExperimentalSoundGateProvider({
  mapId,
  settings,
  systems,
  children,
}: {
  mapId: string;
  settings: ExperimentalSoundLayoutSettings;
  systems: readonly MapSystemNode[];
  children: ReactNode;
}) {
  const eveToMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of systems) m.set(s.systemId, s.id);
    return m;
  }, [systems]);

  const muted = settings.byMap?.[mapId];

  const mapSystemIdForEve = useCallback(
    (eveSystemId: number) => eveToMap.get(eveSystemId) ?? null,
    [eveToMap],
  );

  const isMuted = useCallback(
    (mapSystemId: string, event: SoundEvent) =>
      isSystemSoundMuted(muted, mapSystemId, event),
    [muted],
  );

  const value = useMemo(
    () => ({ isMuted, mapSystemIdForEve, settings }),
    [isMuted, mapSystemIdForEve, settings],
  );

  return (
    <ExperimentalSoundGateContext.Provider value={value}>
      {children}
    </ExperimentalSoundGateContext.Provider>
  );
}

export function useExperimentalSoundGate(): ExperimentalSoundGateValue | null {
  return useContext(ExperimentalSoundGateContext);
}

/** True when the cue should play (no gate or not muted). */
export function shouldPlaySystemSound(
  gate: ExperimentalSoundGateValue | null,
  mapSystemId: string | null,
  event: SoundEvent,
): boolean {
  if (!gate || !mapSystemId) return true;
  return !gate.isMuted(mapSystemId, event);
}
