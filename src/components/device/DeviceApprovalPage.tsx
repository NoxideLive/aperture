'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDeviceApprovalState, submitDeviceApproval } from '@/app/(app)/actions/deviceAuth';
import type { ApiScope } from '@/types';
import type { DeviceApprovalMap } from '@/types';

const SCOPE_LABEL: Record<ApiScope, string> = {
  map: 'Map',
  signatures: 'Signatures',
  signatures_write: 'Signatures (write)',
  pilots: 'Pilots',
  notes: 'Notes',
  mass_log: 'Mass log',
  kills: 'Kills',
};

export function DeviceApprovalPage({ userCode }: { userCode: string }) {
  const [client, setClient] = useState<string | null>(null);
  const [scopes, setScopes] = useState<ApiScope[]>([]);
  const [maps, setMaps] = useState<DeviceApprovalMap[]>([]);
  const [mapId, setMapId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'approved' | 'denied' | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(async () => {
    if (!userCode) {
      setError('Enter the code shown in your app.');
      return;
    }
    const res = await getDeviceApprovalState(userCode);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setClient(res.data.client);
    setScopes(res.data.scopes);
    setMaps(res.data.maps.filter((m) => m.apiEnabled));
    setError(null);
  }, [userCode]);

  useEffect(() => {
    start(() => {
      void load();
    });
  }, [load, start]);

  const submit = (approve: boolean) => {
    if (!userCode) return;
    if (approve && !mapId) {
      setError('Pick a map.');
      return;
    }
    start(async () => {
      const res = await submitDeviceApproval({
        userCode,
        mapId: approve ? mapId : maps[0]?.id ?? '0',
        approve,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(approve ? 'approved' : 'denied');
    });
  };

  if (done === 'approved') {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold">Approved</h1>
        <p className="mt-2 text-muted-foreground">Return to your app to finish connecting.</p>
      </main>
    );
  }
  if (done === 'denied') {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold">Denied</h1>
        <p className="mt-2 text-muted-foreground">This request was not authorized.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-xl font-semibold">Authorize API access</h1>
      {client ? (
        <p className="mt-2 text-muted-foreground">
          <span className="font-medium text-foreground">{client}</span> wants a map API token.
        </p>
      ) : null}
      {scopes.length > 0 ? (
        <ul className="mt-4 list-inside list-disc text-sm">
          {scopes.map((s) => (
            <li key={s}>{SCOPE_LABEL[s] ?? s}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      {maps.length === 0 && !error ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No maps with the API on. Turn it on in Map Settings first.
        </p>
      ) : null}
      {maps.length > 0 ? (
        <div className="mt-6 space-y-4">
          <Select
            value={mapId}
            onValueChange={(value) => {
              if (value !== null) setMapId(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose map" />
            </SelectTrigger>
            <SelectContent>
              {maps.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button disabled={pending} onClick={() => submit(true)}>
              Approve
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => submit(false)}>
              Deny
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}