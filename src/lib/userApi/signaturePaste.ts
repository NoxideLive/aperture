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
import type { UserApiMutationOutcome, UserApiTokenRecord } from '@/types';
import { apertureConfig } from '../../../aperture.config';
import { invalidateUserApiProjection } from './cache';

const bodySchema = z.object({
  systemId: z.number().int().positive(),
  text: z.string().min(1, 'Paste text is required.'),
});

const MAX_PASTE_ROWS = 500;

/** `POST /api/v1/signatures/paste` — lazy-delete signature paste for API tokens. */
export async function serveUserApiSignaturePaste(
  request: NextRequest,
  record: UserApiTokenRecord,
): Promise<UserApiMutationOutcome> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, status: 400, code: 'invalid_request', error: 'Invalid JSON.' };
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const tooLarge = issue?.code === 'too_big';
    if (tooLarge) {
      return {
        ok: false,
        status: 413,
        code: 'payload_too_large',
        error: 'Paste text is too large.',
      };
    }
    return {
      ok: false,
      status: 400,
      code: 'invalid_request',
      error: issue?.message ?? 'Invalid input.',
    };
  }

  if (parsed.data.text.length > apertureConfig.USER_API_SIGNATURE_PASTE_MAX_TEXT) {
    return {
      ok: false,
      status: 413,
      code: 'payload_too_large',
      error: 'Paste text is too large.',
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
  if (rows.length > MAX_PASTE_ROWS) {
    return {
      ok: false,
      status: 400,
      code: 'paste_too_many_rows',
      error: `At most ${MAX_PASTE_ROWS} signatures per paste.`,
    };
  }

  const [mapSystem] = await db
    .select({ id: apMapSystem.id })
    .from(apMapSystem)
    .where(
      and(
        eq(apMapSystem.mapId, record.map.id),
        eq(apMapSystem.systemId, parsed.data.systemId),
        eq(apMapSystem.visible, true),
      ),
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
      code: 'invalid_request',
      error: result.error,
    };
  }

  invalidateUserApiProjection(record.map.id, 'signatures');

  return {
    ok: true,
    data: result.data.summary,
  };
}

const ERROR_ACCESS_LOST = "This token's owner can no longer view the map.";