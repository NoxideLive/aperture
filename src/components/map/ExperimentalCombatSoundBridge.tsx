'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  EXPERIMENTAL_ALERT_EVT,
  readExperimentalCombatAlertSound,
} from '@/lib/experimentalAlertPrefs';
import { getSoundEngine } from '@/lib/sounds/engine';
import { systemNotificationLoadSchema, type Envelope } from '@/lib/realtime/protocol';
import { useRealtimeEvents } from '@/lib/realtime/useRealtime';
import type { MapSystemNode } from '@/lib/map/loadMap';

/** Experimental opt-in combat kill chime (independent of account Sounds prefs). */
export function ExperimentalCombatSoundBridge({
  mapId,
  systems,
}: {
  mapId: string;
  systems: readonly MapSystemNode[];
}) {
  const [enabled, setEnabled] = useState(readExperimentalCombatAlertSound);
  const systemIds = useCallback(
    () => new Set(systems.map((s) => s.systemId)),
    [systems],
  );

  useEffect(() => {
    const sync = () => setEnabled(readExperimentalCombatAlertSound());
    sync();
    window.addEventListener(EXPERIMENTAL_ALERT_EVT, sync);
    return () => window.removeEventListener(EXPERIMENTAL_ALERT_EVT, sync);
  }, []);

  useRealtimeEvents(
    useCallback(
      (envelope: Envelope) => {
        if (!enabled) return;
        if (envelope.task !== 'systemNotification') return;
        const parsed = systemNotificationLoadSchema.safeParse(envelope.load);
        if (!parsed.success || parsed.data.kind !== 'killmail') return;
        if (parsed.data.mapId !== Number(mapId)) return;
        if (!systemIds().has(parsed.data.systemId)) return;
        getSoundEngine().preview('alarm');
      },
      [enabled, mapId, systemIds],
    ),
  );

  return null;
}
