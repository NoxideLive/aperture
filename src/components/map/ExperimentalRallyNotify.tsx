'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { mapUpdateLoadSchema, type Envelope } from '@/lib/realtime/protocol';
import { useRealtimeEvents } from '@/lib/realtime/useRealtime';

/** Experimental-only rally toast + best-effort desktop notification. */
export function ExperimentalRallyNotify({ mapId }: { mapId: string }) {
  useRealtimeEvents(
    useCallback(
      (envelope: Envelope) => {
        if (envelope.task !== 'mapUpdate') return;
        const parsed = mapUpdateLoadSchema.safeParse(envelope.load);
        if (!parsed.success || parsed.data.mapId !== Number(mapId)) return;
        const payload = parsed.data.data;
        if (payload?.kind !== 'system.updated' || payload.rallyAt == null) return;

        const name = payload.alias?.trim() || payload.tag?.trim() || `System ${payload.id}`;
        toast.message('Rally point set', { description: name });
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('Rally point set', { body: name, tag: `rally-${payload.id}` });
          } catch {
            return;
          }
        }
      },
      [mapId],
    ),
  );

  return null;
}
