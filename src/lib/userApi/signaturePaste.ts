import 'server-only';
import { and, eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { apMapSystem } from '@/db/schema';
import { LAZY_DELETE_PASTE_OPTIONS } from '@/lib/map/applySignaturePaste';
import { pasteSignatures } from '@/lib/map/mutations/bulkSignatures';
import { parseSignaturePaste } from '@/lib/map/signatureParser';
import { resolveSignatureRows } from '@/lib/map/signatureReader';
import type { UserApiMutationServe, UserApiTokenRecord } from '@/types';
import { apertureConfig } from '../../../aperture.config';
import { clearUserApiProjections } from './cache';
import { invalidateUserApiMap } from './authorize';

const bodySchema = z.object({
  systemId: z.number().int().positive(),
  text: z
    .string()
    .min(1, 'Paste text is required.')
    .max(apertureConfig.USER_API_SIGNATURE_PASTE_MAX_TEXT, 'Paste text is too large.'),
});

/** `POST /api/v1/signatures/paste` — lazy-delete signature paste for API tokens. */
export const serveUserApiSignaturePaste: UserApiMutationServe = async (
  request: NextRequest,
  record: UserApiTokenRecord,
) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, status: 400, code: 'server_error', error: 'Invalid JSON.' };
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'server_error',
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }

  const rows = parseSignaturePaste(parsed.data.text);
  if (rows.length === 0) {
    return {
      ok: false,
      status: 400,
      code: 'not_scanner_data',
      error: 'The paste did not look like probe-scanner output.',
    };
  }

  const [mapSystem] = await db
    .select({ id: apMapSystem.id })
    .from(apMapSystem)
    .where(
      and(eq(apMapSystem.mapId, record.map.id), eq(apMapSystem.systemId, parsed.data.systemId)),
    )
    .limit(1);
  if (!mapSystem) {
    return {
      ok: false,
      status: 404,
      code: 'system_not_on_map',
      error: 'That solar system is not on this map.',
    };
  }

  const mainId = record.account.mainCharacterId;
  if (mainId === null) {
    return { ok: false, status: 403, code: 'access_lost', error: ERROR_ACCESS_LOST };
  }

  const resolved = await resolveSignatureRows(rows);
  const result = await pasteSignatures({
    mapId: record.map.id,
    mapSystemId: mapSystem.id,
    characterId: mainId,
    rows: resolved,
    options: LAZY_DELETE_PASTE_OPTIONS,
    defaultExpiresAt: new Date(Date.now() + apertureConfig.SIGNATURE_DEFAULT_TTL_MS),
  });

  if (!result.ok) {
    return {
      ok: false,
      status: 400,
      code: 'server_error',
      error: result.error,
    };
  }

  invalidateUserApiMap(record.map.id);
  clearUserApiProjections();

  return {
    ok: true,
    data: result.data.summary,
  };
};

const ERROR_ACCESS_LOST =
  "This token's owner can no longer view the map.";