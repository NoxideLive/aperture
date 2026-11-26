import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, count, eq, gt, isNull, or } from 'drizzle-orm';
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
import { commitMapEvent } from '@/lib/map/mutations/core';
import { encryptToken, decryptToken } from '@/lib/crypto';
import { canViewMap } from '@/lib/auth/rights';
import { isUserApiAccountBlocked } from '@/lib/userApi/authorize';
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

function formatUserCode(bytes: Buffer): string {
  const alphabet = 'BCDFGHJKLMNPQRSTVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
    if (i === 3) out += '-';
  }
  return out;
}

function deviceCode(): string {
  return randomBytes(32).toString('base64url');
}

function normaliseScopes(scopes: readonly ApiScope[]): ApiScope[] {
  const set = new Set(scopes);
  return apiScope.enumValues.filter((s) => set.has(s));
}

function checkDeviceIp(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
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

/** `POST /api/v1/device/start` — begin a device authorization session. */
export const serveUserApiDeviceStart: UserApiPublicServe = async (request: NextRequest) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, status: 400, code: 'server_error', error: 'Invalid JSON.' };
  }
  const parsed = startSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'server_error',
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }
  if (!REGISTERED_CLIENTS.has(parsed.data.client)) {
    return { ok: false, status: 400, code: 'server_error', error: 'Unknown client.' };
  }

  const device = deviceCode();
  const userCode = formatUserCode(randomBytes(8));
  const expiresAt = new Date(Date.now() + apertureConfig.USER_API_DEVICE_EXPIRES_MS);
  const interval = apertureConfig.USER_API_DEVICE_POLL_INTERVAL_SEC;
  const origin = new URL(request.url).origin;

  await db.insert(apUserApiDevice).values({
    deviceCodeHash: hashDeviceCode(device),
    userCode,
    client: parsed.data.client,
    requestedScopes: normaliseScopes(parsed.data.scopes),
    expiresAt,
    pollIntervalSec: interval,
  });

  return {
    ok: true,
    data: {
      deviceCode: device,
      userCode,
      verificationUri: `${origin}/device`,
      verificationUriComplete: `${origin}/device?code=${encodeURIComponent(userCode)}`,
      interval,
      expiresIn: Math.ceil(apertureConfig.USER_API_DEVICE_EXPIRES_MS / 1000),
    },
  };
};

const pollSchema = z
  .object({
    deviceCode: z.string().min(10).optional(),
    userCode: z.string().min(4).optional(),
  })
  .refine((v) => v.deviceCode !== undefined || v.userCode !== undefined, {
    message: 'Send deviceCode or userCode.',
  });

async function loadDeviceSession(
  deviceCodeRaw: string | undefined,
  userCodeRaw: string | undefined,
) {
  if (deviceCodeRaw !== undefined) {
    const [row] = await db
      .select()
      .from(apUserApiDevice)
      .where(eq(apUserApiDevice.deviceCodeHash, hashDeviceCode(deviceCodeRaw)))
      .limit(1);
    return row ?? null;
  }
  const normalised = userCodeRaw!.toUpperCase().replace(/\s+/g, '');
  const [row] = await db
    .select()
    .from(apUserApiDevice)
    .where(eq(apUserApiDevice.userCode, normalised))
    .limit(1);
  return row ?? null;
}

/** `POST /api/v1/device/token` — poll for approval or pick up a minted token. */
export const serveUserApiDeviceToken: UserApiPublicServe = async (request: NextRequest) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, status: 400, code: 'server_error', error: 'Invalid JSON.' };
  }
  const parsed = pollSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: 'server_error',
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }

  const row = await loadDeviceSession(parsed.data.deviceCode, parsed.data.userCode);
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

  if (row.lastPollAt !== null) {
    const elapsed = (now.getTime() - row.lastPollAt.getTime()) / 1000;
    if (elapsed < row.pollIntervalSec) {
      return {
        ok: false,
        status: 429,
        code: 'slow_down',
        error: 'Poll again after the interval.',
      };
    }
  }
  await db
    .update(apUserApiDevice)
    .set({ lastPollAt: now })
    .where(eq(apUserApiDevice.id, row.id));

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

  if (row.status === 'pending') {
    return {
      ok: false,
      status: 400,
      code: 'authorization_pending',
      error: 'Waiting for approval in the browser.',
    };
  }

  if (row.status !== 'approved' || row.mintedTokenEnc === null || row.mapId === null) {
    return { ok: false, status: 500, code: 'server_error', error: 'Approval state is invalid.' };
  }

  const [map] = await db
    .select({ name: apMap.name })
    .from(apMap)
    .where(eq(apMap.id, row.mapId))
    .limit(1);
  if (!map) {
    return { ok: false, status: 500, code: 'server_error', error: 'Map is missing.' };
  }

  const token = decryptToken(row.mintedTokenEnc);
  await db
    .update(apUserApiDevice)
    .set({ status: 'consumed', consumedAt: now, mintedTokenEnc: null })
    .where(eq(apUserApiDevice.id, row.id));

  const [minted] = row.mintedTokenId
    ? await db
        .select({ expiresAt: apMapApiToken.expiresAt, scopes: apMapApiToken.scopes })
        .from(apMapApiToken)
        .where(eq(apMapApiToken.id, row.mintedTokenId))
        .limit(1)
    : [];

  return {
    ok: true,
    data: {
      token,
      map: { id: row.mapId.toString(), name: map.name },
      scopes: minted?.scopes ?? row.requestedScopes,
      expiresAt: minted?.expiresAt?.toISOString() ?? null,
    },
  };
};

/** Maps the signed-in user may attach a device authorization to. */
export async function listDeviceApprovalMaps(userId: number): Promise<DeviceApprovalMap[]> {
  const chars = await db
    .select({ id: apCharacter.id })
    .from(apCharacter)
    .where(eq(apCharacter.userId, userId));
  if (chars.length === 0) return [];

  const maps = await db
    .select({
      id: apMap.id,
      name: apMap.name,
      apiEnabled: apMap.apiEnabled,
      apiScopes: apMap.apiScopes,
      deletedAt: apMap.deletedAt,
    })
    .from(apMap)
    .where(isNull(apMap.deletedAt));

  const out: DeviceApprovalMap[] = [];
  for (const m of maps) {
    let can = false;
    for (const c of chars) {
      if (await canViewMap(c.id, m.id)) {
        can = true;
        break;
      }
    }
    if (!can) continue;
    out.push({
      id: m.id.toString(),
      name: m.name,
      apiEnabled: m.apiEnabled,
      apiScopes: normaliseScopes(m.apiScopes),
    });
  }
  return out;
}

export async function getDeviceSessionForUserCode(userCode: string) {
  const normalised = userCode.toUpperCase().replace(/\s+/g, '');
  const [row] = await db
    .select()
    .from(apUserApiDevice)
    .where(eq(apUserApiDevice.userCode, normalised))
    .limit(1);
  return row ?? null;
}

const approveSchema = z.object({
  userCode: z.string().min(4),
  mapId: z.string().regex(/^\d+$/),
  approve: z.boolean(),
});

/**
 * Approve or deny a device session from the browser. Approval mints a normal
 * `ap_map_api_token` row and holds the raw token encrypted until first poll.
 */
export async function decideDeviceAuthorization(
  input: z.input<typeof approveSchema>,
  userId: number,
  actorCharacterId: bigint,
): Promise<{ ok: true } | { ok: false; error: string }> {
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
      .where(eq(apUserApiDevice.id, row.id));
    return { ok: true };
  }

  const mapId = BigInt(parsed.data.mapId);
  if (!(await canViewMap(actorCharacterId, mapId))) {
    return { ok: false, error: 'You cannot use the API on this map.' };
  }

  const [account] = await db
    .select({
      apiBlockedAt: apUser.apiBlockedAt,
      apiBlockedUntil: apUser.apiBlockedUntil,
    })
    .from(apUser)
    .where(eq(apUser.id, userId));
  if (!account || isUserApiAccountBlocked(account, new Date())) {
    return { ok: false, error: 'API access is blocked for your account.' };
  }

  const { token, hash, prefix } = generateUserApiToken();
  const scopes = normaliseScopes(row.requestedScopes);
  const label = row.client === 'eves-little-copilot' ? "Eve's Little CoPilot" : row.client;

  try {
    await db.transaction(async (tx) => {
      const [map] = await tx
        .select({ apiEnabled: apMap.apiEnabled, apiScopes: apMap.apiScopes })
        .from(apMap)
        .where(eq(apMap.id, mapId))
        .for('update');
      if (!map?.apiEnabled) throw new Error('The API is turned off on this map.');
      const exposed = new Set(map.apiScopes);
      if (scopes.some((s) => !exposed.has(s))) {
        throw new Error('This map does not expose every requested scope.');
      }

      const [onMap] = await tx
        .select({ n: count() })
        .from(apMapApiToken)
        .where(
          and(
            eq(apMapApiToken.userId, userId),
            eq(apMapApiToken.mapId, mapId),
            isNull(apMapApiToken.revokedAt),
            or(isNull(apMapApiToken.expiresAt), gt(apMapApiToken.expiresAt, new Date())),
          ),
        );
      if ((onMap?.n ?? 0) >= apertureConfig.USER_API_MAX_TOKENS_PER_ACCOUNT_PER_MAP) {
        throw new Error('You already have the maximum number of tokens on this map.');
      }

      const [accountTokens] = await tx
        .select({ n: count() })
        .from(apMapApiToken)
        .where(
          and(
            eq(apMapApiToken.userId, userId),
            isNull(apMapApiToken.revokedAt),
            or(isNull(apMapApiToken.expiresAt), gt(apMapApiToken.expiresAt, new Date())),
          ),
        );
      if ((accountTokens?.n ?? 0) >= apertureConfig.USER_API_MAX_TOKENS_PER_ACCOUNT) {
        throw new Error('You already have the maximum number of tokens.');
      }

      const committed = await commitMapEvent({
        tx,
        mapId,
        characterId: actorCharacterId,
        kind: 'api.token_created',
        mutate: async (innerTx) => {
          const [inserted] = await innerTx
            .insert(apMapApiToken)
            .values({
              mapId,
              userId,
              tokenHash: hash,
              tokenPrefix: prefix,
              label,
              scopes,
              expiresAt: null,
            })
            .returning({ id: apMapApiToken.id });
          if (!inserted) throw new Error('Could not mint token.');
          await innerTx
            .update(apUserApiDevice)
            .set({
              status: 'approved',
              approvedAt: new Date(),
              userId,
              mapId,
              approvedByCharacterId: actorCharacterId,
              mintedTokenId: inserted.id,
              mintedTokenEnc: encryptToken(token),
            })
            .where(eq(apUserApiDevice.id, row.id));
          return {
            tokenId: inserted.id.toString(),
            label,
            scopes,
            expiresAt: null,
          };
        },
      });
      if (!committed.ok) throw new Error(committed.error);
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not approve.' };
  }

  return { ok: true };
}

export { checkDeviceIp };