'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  EXPERIMENTAL_ALERT_EVT,
  readExperimentalRallyDesktopNotification,
  readExperimentalRallyToast,
} from '@/lib/experimentalAlertPrefs';
import { mapUpdateLoadSchema, type Envelope } from '@/lib/realtime/protocol';
import { useRealtimeEvents } from '@/lib/realtime/useRealtime';

/** Experimental rally alerts — toast and desktop notification, each opt-in. */
export function ExperimentalRallyNotify({ mapId }: { mapId: string }) {
  const [toastOn, setToastOn] = useState(readExperimentalRallyToast);
  const [desktopOn, setDesktopOn] = useState(readExperimentalRallyDesktopNotification);

  useEffect(() => {
    const sync = () => {
      setToastOn(readExperimentalRallyToast());
      setDesktopOn(readExperimentalRallyDesktopNotification());
    };
    sync();
    window.addEventListener(EXPERIMENTAL_ALERT_EVT, sync);
    return () => window.removeEventListener(EXPERIMENTAL_ALERT_EVT, sync);
  }, []);

  useRealtimeEvents(
    useCallback(
      (envelope: Envelope) => {
        if (!toastOn && !desktopOn) return;
        if (envelope.task !== 'mapUpdate') return;
        const parsed = mapUpdateLoadSchema.safeParse(envelope.load);
        if (!parsed.success || parsed.data.mapId !== Number(mapId)) return;
        const payload = parsed.data.data;
        if (payload?.kind !== 'system.updated' || payload.rallyAt == null) return;

        const name = payload.alias?.trim() || payload.tag?.trim() || `System ${payload.id}`;
        if (toastOn) {
          toast.message('Rally point set', { description: name });
        }
        if (
          desktopOn &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          try {
            new Notification('Rally point set', { body: name, tag: `rally-${payload.id}` });
          } catch {
            return;
          }
        }
      },
      [mapId, toastOn, desktopOn],
    ),
  );

  return null;
}
