'use server';

import {
  decideDeviceAuthorization,
  getDeviceSessionForUserCode,
  listDeviceApprovalMaps,
} from '@/lib/userApi/device';
import { requireSession } from '@/lib/session';

export async function getDeviceApprovalState(userCode: string) {
  const session = await requireSession();
  const row = await getDeviceSessionForUserCode(userCode);
  if (!row || row.status !== 'pending' || row.expiresAt <= new Date()) {
    return { ok: false as const, error: 'This code is not waiting for approval.' };
  }
  const maps = await listDeviceApprovalMaps(session.userId, row.requestedScopes);
  return {
    ok: true as const,
    data: {
      client: row.client,
      scopes: row.requestedScopes,
      expiresAt: row.expiresAt.toISOString(),
      maps,
    },
  };
}

export async function submitDeviceApproval(input: {
  userCode: string;
  mapId?: string;
  approve: boolean;
}) {
  const session = await requireSession();
  const result = await decideDeviceAuthorization(input, session.userId, BigInt(session.characterId));
  if (!result.ok) return result;
  if (result.token) {
    return {
      ok: true as const,
      data: { token: result.token, mapName: result.mapName ?? '' },
    };
  }
  return { ok: true as const };
}