import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import {
  apCharacter,
  apiScope,
  apMap,
  apMapApiToken,
  apUser,
  apUserApiDevice,
} from '@/db/schema';
import { isLoginAllowed } from '@/lib/auth/loginGate';
import { viewableMapPredicate } from '@/lib/auth/rights';
import { encryptToken, decryptToken } from '@/lib/crypto';
import { commitMapEvent } from '@/lib/map/mutations/core';
import {
  USER_API_DEFAULT_MINT_EXPIRY_DAYS,
  accountMainCanUseMap,
  mintMapApiTokenInTx,
} from '@/lib/userApi/mint';
import { generateUserApiToken } from '@/lib/userApi/token';
import { isUserApiInstanceEnabled } from '@/lib/userApi/instance';
import type { ApiScope, DeviceApprovalMap, UserApiPublicServe } from '@/types';
import { apertureConfig } from '../../../aperture.config';

const REGISTERED_CLIENTS = new Set(['eves-little-copilot']);

declare global {
  var __apertureUserApiDeviceIp: Map<string, { count: number; windowStart: number }> | undefined;
}

const deviceIp =
  globalThis.__apertureUserApiDeviceIp ??
  new Map<string, { count: number; windowStart: number }>();
globalThis.__apertureUserApiDeviceIp = deviceIp;

function hashDeviceCode(deviceCode: string): string {
  return createHash('sha256').update(deviceCode).digest('hex');
}

export function normalizeUserCode(userCode: string): string {
  return userCode.toUpperCase().replace(/[\s-]+/g, '');
}

/** Formats a stored user code as `XXXX-XXXX` for display. */
export function formatUserCodeForDisplay(stored: string): string {
  const bare = normalizeUserCode(stored);
  if (bare.length !== 8) return stored;
  return `${bare.slice(0, 4)}-${bare.slice(4)}`;
}

function formatUserCode(bytes: Buffer): string {
  const alphabet = 'BCDFGHJKLMNPQRSTVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

function deviceCode(): string {
  return randomBytes(32).toString('base64url');
}

function normaliseScopes(scopes: readonly ApiScope[]): ApiScope[] {
  const set = new Set(scopes);
  return apiScope.enumValues.filter((s) => set.has(s));
}

export function checkDeviceIp(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const window = apertureConfig.USER_API_RATE_WINDOW_MS;
  const max = apertureConfig.USER_API_DEVICE_MAX_PER_IP;
  const entry = deviceIp.get(ip);
  if (!entry || now - entry.windowStart >= window) {
    deviceIp.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (entry.count >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.windowStart + window - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  entry.count += 1;
  return { ok: true };
}

export function __resetUserApiDeviceRateLimit(): void {
  deviceIp.clear();
}

const startSchema = z.object({
  client: z.string().min(1).max(60),
  scopes: z.array(z.enum(apiScope.enumValues)).min(1),
});

const MAX_START_ATTEMPTS = 5;

/** `POST /api/v1/device/start` — begin a device authorization session. */
export const serveUserApiDeviceStart: UserApiPublicServe = async (request: NextRequest) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, status: 400, code: 'invalid_request', error: 'Invalid JSON.' };
  }
  const parsed = startSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_request',
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }
  if (!REGISTERED_CLIENTS.has(parsed.data.client)) {
    return { ok: false, status: 400, code: 'invalid_request', error: 'Unknown client.' };
  }

  const device = deviceCode();
  const expiresAt = new Date(Date.now() + apertureConfig.USER_API_DEVICE_EXPIRES_MS);
  const interval = apertureConfig.USER_API_DEVICE_POLL_INTERVAL_SEC;
  const origin = new URL(request.url).origin;
  const scopes = normaliseScopes(parsed.data.scopes);

  for (let attempt = 0; attempt < MAX_START_ATTEMPTS; attempt++) {
    const userCodeDisplay = formatUserCode(randomBytes(8));
    const userCodeStored = normalizeUserCode(userCodeDisplay);
    try {
      await db.insert(apUserApiDevice).values({
        deviceCodeHash: hashDeviceCode(device),
        userCode: userCodeStored,
        client: parsed.data.client,
        requestedScopes: scopes,
        expiresAt,
        pollIntervalSec: interval,
      });
      return {
        ok: true,
        data: {
          deviceCode: device,
          userCode: userCodeDisplay,
          verificationUri: `${origin}/device`,
          verificationUriComplete: `${origin}/device?code=${encodeURIComponent(userCodeDisplay)}`,
          interval,
          expiresIn: Math.ceil(apertureConfig.USER_API_DEVICE_EXPIRES_MS / 1000),
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('user_code') || msg.includes('user_code_unique')) continue;
      throw err;
    }
  }

  return { ok: false, status: 500, code: 'server_error', error: 'Could not start authorization.' };
};

const pollSchema = z.object({
  deviceCode: z.string().min(10),
});

async function loadSessionByDeviceCode(deviceCodeRaw: string) {
  const [row] = await db
    .select({
      id: apUserApiDevice.id,
      mapId: apUserApiDevice.mapId,
      mintedTokenId: apUserApiDevice.mintedTokenId,
      requestedScopes: apUserApiDevice.requestedScopes,
      pollIntervalSec: apUserApiDevice.pollIntervalSec,
      lastPollAt: apUserApiDevice.lastPollAt,
      status: apUserApiDevice.status,
      expiresAt: apUserApiDevice.expiresAt,
    })
    .from(apUserApiDevice)
    .where(eq(apUserApiDevice.deviceCodeHash, hashDeviceCode(deviceCodeRaw)))
    .limit(1);
  return row ?? null;
}

async function claimPollInterval(
  sessionId: bigint,
  intervalSec: number,
  now: Date,
): Promise<boolean> {
  const result = await db.execute<{ id: string }>(sql`
    UPDATE ap_user_api_device
    SET last_poll_at = ${now}
    WHERE id = ${sessionId}
      AND status IN ('pending', 'approved')
      AND (
        last_poll_at IS NULL
        OR last_poll_at <= ${now} - make_interval(secs => ${intervalSec})
      )
    RETURNING id
  `);
  return result.rows.length > 0;
}

async function consumeApprovedToken(sessionId: bigint, now: Date) {
  const result = await db.execute<{
    minted_token_enc: string;
    map_id: string;
    minted_token_id: string | null;
    requested_scopes: ApiScope[];
  }>(sql`
    UPDATE ap_user_api_device
    SET status = 'consumed', consumed_at = ${now}, minted_token_enc = NULL
    WHERE id = ${sessionId}
      AND status = 'approved'
      AND minted_token_enc IS NOT NULL
    RETURNING minted_token_enc, map_id, minted_token_id, requested_scopes
  `);
  return result.rows[0] ?? null;
}

/** `POST /api/v1/device/token` — poll by `deviceCode` only (RFC 8628). */
export const serveUserApiDeviceToken: UserApiPublicServe = async (request: NextRequest) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, status: 400, code: 'invalid_request', error: 'Invalid JSON.' };
  }
  const parsed = pollSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_request',
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }

  const row = await loadSessionByDeviceCode(parsed.data.deviceCode);
  if (!row) {
    return {
      ok: false,
      status: 400,
      code: 'expired_token',
      error: 'This device code is unknown or has expired.',
    };
  }

  const now = new Date();

  if (row.expiresAt <= now && row.status === 'pending') {
    await db
      .update(apUserApiDevice)
      .set({ status: 'expired' })
      .where(eq(apUserApiDevice.id, row.id));
    return {
      ok: false,
      status: 400,
      code: 'expired_token',
      error: 'This device code has expired.',
    };
  }

  if (row.status === 'denied') {
    return {
      ok: false,
      status: 403,
      code: 'access_denied',
      error: 'Authorization was denied.',
    };
  }

  if (row.status === 'consumed' || row.status === 'expired') {
    return {
      ok: false,
      status: 400,
      code: 'expired_token',
      error: 'This device code has already been used or has expired.',
    };
  }

  const claimed = await claimPollInterval(row.id, row.pollIntervalSec, now);
  if (!claimed) {
    const waitSec = row.lastPollAt
      ? Math.max(
          1,
          row.pollIntervalSec - Math.floor((now.getTime() - row.lastPollAt.getTime()) / 1000),
        )
      : row.pollIntervalSec;
    return {
      ok: false,
      status: 429,
      code: 'slow_down',
      error: 'Poll again after the interval.',
      retryAfterSec: waitSec,
    };
  }

  if (row.status === 'pending') {
    return {
      ok: false,
      status: 400,
      code: 'authorization_pending',
      error: 'Waiting for approval in the browser.',
    };
  }

  if (row.status !== 'approved' || row.mapId === null) {
    return { ok: false, status: 500, code: 'server_error', error: 'Approval state is invalid.' };
  }

  const consumed = await consumeApprovedToken(row.id, now);
  if (!consumed) {
    return {
      ok: false,
      status: 400,
      code: 'expired_token',
      error: 'This device code has already been used or has expired.',
    };
  }

  const mapId = BigInt(consumed.map_id);
  const [map] = await db
    .select({ name: apMap.name })
    .from(apMap)
    .where(eq(apMap.id, mapId))
    .limit(1);
  if (!map) {
    return { ok: false, status: 500, code: 'server_error', error: 'Map is missing.' };
  }

  const token = decryptToken(consumed.minted_token_enc);
  const mintedTokenId = consumed.minted_token_id ? BigInt(consumed.minted_token_id) : null;

  const [minted] = mintedTokenId
    ? await db
        .select({ expiresAt: apMapApiToken.expiresAt, scopes: apMapApiToken.scopes })
        .from(apMapApiToken)
        .where(eq(apMapApiToken.id, mintedTokenId))
        .limit(1)
    : [];

  return {
    ok: true,
    data: {
      token,
      map: { id: mapId.toString(), name: map.name },
      scopes: minted?.scopes ?? consumed.requested_scopes,
      expiresAt: minted?.expiresAt?.toISOString() ?? null,
    },
  };
};

/** Maps the account's main may mint on for a device request. */
export async function listDeviceApprovalMaps(
  userId: number,
  requestedScopes: ApiScope[],
): Promise<DeviceApprovalMap[]> {
  const [main] = await db
    .select({
      mainId: apCharacter.id,
      mainStatus: apCharacter.status,
      mainCorporationId: apCharacter.corporationId,
      mainAllianceId: apCharacter.allianceId,
    })
    .from(apUser)
    .leftJoin(
      apCharacter,
      and(eq(apCharacter.id, apUser.mainCharacterId), eq(apCharacter.userId, apUser.id)),
    )
    .where(eq(apUser.id, userId));
  if (!main?.mainId || main.mainStatus !== 'active') return [];

  const login = await isLoginAllowed({
    characterId: main.mainId,
    corporationId: main.mainCorporationId,
    allianceId: main.mainAllianceId,
  });
  if (!login) return [];

  const viewable = await viewableMapPredicate(main.mainId);
  const needed = new Set(requestedScopes);
  const maps = await db
    .select({
      id: apMap.id,
      name: apMap.name,
      apiEnabled: apMap.apiEnabled,
      apiScopes: apMap.apiScopes,
    })
    .from(apMap)
    .where(
      and(
        isNull(apMap.deletedAt),
        eq(apMap.apiEnabled, true),
        viewable === undefined ? sql`true` : viewable,
      ),
    );

  return maps
    .filter((m) => requestedScopes.every((s) => m.apiScopes.includes(s)))
    .map((m) => ({
      id: m.id.toString(),
      name: m.name,
      apiEnabled: m.apiEnabled,
      apiScopes: normaliseScopes(m.apiScopes).filter((s) => needed.has(s)),
    }));
}

export async function getDeviceSessionForUserCode(userCode: string) {
  const normalised = normalizeUserCode(userCode);
  const [row] = await db
    .select()
    .from(apUserApiDevice)
    .where(eq(apUserApiDevice.userCode, normalised))
    .limit(1);
  return row ?? null;
}

const approveSchema = z
  .object({
    userCode: z.string().min(4),
    mapId: z.string().regex(/^\d+$/).optional(),
    approve: z.boolean(),
  })
  .refine((v) => !v.approve || v.mapId !== undefined, { message: 'Pick a map.' });

export type DeviceAuthorizationResult =
  | { ok: true; token?: string; mapName?: string }
  | { ok: false; error: string };

/**
 * Approve or deny a device session. Approval mints a token inside the same
 * transaction as the pending-row claim; returns the raw bearer token once for
 * copy-paste (poll competes on the same single-use consume).
 */
export async function decideDeviceAuthorization(
  input: z.input<typeof approveSchema>,
  userId: number,
  actorCharacterId: bigint,
): Promise<DeviceAuthorizationResult> {
  if (!(await isUserApiInstanceEnabled())) {
    return { ok: false, error: 'The API is turned off on this instance.' };
  }

  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };

  const row = await getDeviceSessionForUserCode(parsed.data.userCode);
  if (!row || row.status !== 'pending') {
    return { ok: false, error: 'This authorization is no longer waiting.' };
  }
  if (row.expiresAt <= new Date()) {
    await db
      .update(apUserApiDevice)
      .set({ status: 'expired' })
      .where(eq(apUserApiDevice.id, row.id));
    return { ok: false, error: 'This code has expired.' };
  }

  if (!parsed.data.approve) {
    await db
      .update(apUserApiDevice)
      .set({ status: 'denied', deniedAt: new Date(), userId })
      .where(and(eq(apUserApiDevice.id, row.id), eq(apUserApiDevice.status, 'pending')));
    return { ok: true };
  }

  const mapId = BigInt(parsed.data.mapId!);
  if (!(await accountMainCanUseMap(userId, mapId))) {
    return { ok: false, error: "Your account's main cannot use the API on this map." };
  }

  const scopes = normaliseScopes(row.requestedScopes);
  const label = row.client === 'eves-little-copilot' ? "Eve's Little CoPilot" : row.client;
  const { token, hash, prefix } = generateUserApiToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + USER_API_DEFAULT_MINT_EXPIRY_DAYS * 86_400_000);

  try {
    let mapName = '';
    await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(apUserApiDevice)
        .set({ userId })
        .where(and(eq(apUserApiDevice.id, row.id), eq(apUserApiDevice.status, 'pending')))
        .returning({ id: apUserApiDevice.id });
      if (!claimed) throw new Error('This authorization is no longer waiting.');

      const committed = await commitMapEvent({
        tx,
        mapId,
        characterId: actorCharacterId,
        kind: 'api.token_created',
        mutate: async (innerTx) =>
          mintMapApiTokenInTx(
            innerTx,
            { mapId, userId, label, scopes, expiresAt, hash, prefix },
            now,
          ),
      });
      if (!committed.ok) throw new Error(committed.error);
      if (committed.data.kind !== 'api.token_created') throw new Error('Mint failed.');
      const tokenId = BigInt(committed.data.tokenId);

      const [map] = await tx.select({ name: apMap.name }).from(apMap).where(eq(apMap.id, mapId));
      mapName = map?.name ?? '';

      await tx
        .update(apUserApiDevice)
        .set({
          status: 'approved',
          approvedAt: now,
          mapId,
          approvedByCharacterId: actorCharacterId,
          mintedTokenId: tokenId,
          mintedTokenEnc: encryptToken(token),
        })
        .where(eq(apUserApiDevice.id, row.id));
    });

    const delivered = await consumeApprovedToken(row.id, now);
    if (!delivered) {
      return { ok: false, error: 'The app already received this token.' };
    }

    return { ok: true, token, mapName };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not approve.' };
  }
}