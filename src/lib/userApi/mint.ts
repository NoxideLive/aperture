import 'server-only';
import { and, count, eq, gt, isNull, or, type SQL } from 'drizzle-orm';
import { db } from '@/db/client';
import { apCharacter, apMap, apMapApiToken, apUser } from '@/db/schema';
import { isLoginAllowed } from '@/lib/auth/loginGate';
import { canViewMap } from '@/lib/auth/rights';
import { commitMapEvent, type Tx } from '@/lib/map/mutations/core';
import type { ApiScope } from '@/types';
import { apertureConfig } from '../../../aperture.config';
import { isUserApiAccountBlocked } from './authorize';
import { generateUserApiToken } from './token';

const DAY_MS = 86_400_000;

/** Default mint expiry for device-issued tokens (matches the web UI's 90-day option). */
export const USER_API_DEFAULT_MINT_EXPIRY_DAYS = 90;

function liveTokenWhere(now: Date): SQL {
  return and(
    isNull(apMapApiToken.revokedAt),
    or(isNull(apMapApiToken.expiresAt), gt(apMapApiToken.expiresAt, now)),
  )!;
}

/** Whether an account's main passes the API access step on one map. */
export async function accountMainCanUseMap(userId: number, mapId: bigint): Promise<boolean> {
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
  if (!main?.mainId || main.mainStatus !== 'active') return false;
  const [view, login] = await Promise.all([
    canViewMap(main.mainId, mapId),
    isLoginAllowed({
      characterId: main.mainId,
      corporationId: main.mainCorporationId,
      allianceId: main.mainAllianceId,
    }),
  ]);
  return view && login;
}

export type MintMapApiTokenFields = {
  mapId: bigint;
  userId: number;
  label: string;
  scopes: ApiScope[];
  expiresAt: Date | null;
  hash: string;
  prefix: string;
};

/**
 * Inserts one `ap_map_api_token` row under an account `FOR UPDATE` lock with
 * the same cap and scope checks as `createMapApiToken`. Throws on refusal.
 */
export async function mintMapApiTokenInTx(tx: Tx, fields: MintMapApiTokenFields, now: Date) {
  const [account] = await tx
    .select({
      apiBlockedAt: apUser.apiBlockedAt,
      apiBlockedUntil: apUser.apiBlockedUntil,
    })
    .from(apUser)
    .where(eq(apUser.id, fields.userId))
    .for('update');
  if (!account) throw new Error('Account not found.');
  if (isUserApiAccountBlocked(account, now)) {
    throw new Error('API access is blocked for your account.');
  }

  const [map] = await tx
    .select({ apiEnabled: apMap.apiEnabled, apiScopes: apMap.apiScopes })
    .from(apMap)
    .where(eq(apMap.id, fields.mapId));
  if (!map?.apiEnabled) throw new Error('The API is turned off on this map.');
  const exposed = new Set(map.apiScopes);
  if (fields.scopes.some((s) => !exposed.has(s))) {
    throw new Error('This map does not expose every scope you chose.');
  }

  if (!(await accountMainCanUseMap(fields.userId, fields.mapId))) {
    throw new Error("Your account's main character cannot use the API on this map.");
  }

  const live = liveTokenWhere(now);
  const [onMap] = await tx
    .select({ n: count() })
    .from(apMapApiToken)
    .where(
      and(eq(apMapApiToken.userId, fields.userId), eq(apMapApiToken.mapId, fields.mapId), live),
    );
  if ((onMap?.n ?? 0) >= apertureConfig.USER_API_MAX_TOKENS_PER_ACCOUNT_PER_MAP) {
    throw new Error(
      `You already have ${apertureConfig.USER_API_MAX_TOKENS_PER_ACCOUNT_PER_MAP} live tokens on this map. Revoke one first.`,
    );
  }
  const [onAccount] = await tx
    .select({ n: count() })
    .from(apMapApiToken)
    .where(and(eq(apMapApiToken.userId, fields.userId), live));
  if ((onAccount?.n ?? 0) >= apertureConfig.USER_API_MAX_TOKENS_PER_ACCOUNT) {
    throw new Error(
      `Your account already has ${apertureConfig.USER_API_MAX_TOKENS_PER_ACCOUNT} live tokens. Revoke one first.`,
    );
  }

  const [row] = await tx
    .insert(apMapApiToken)
    .values({
      mapId: fields.mapId,
      userId: fields.userId,
      tokenHash: fields.hash,
      tokenPrefix: fields.prefix,
      label: fields.label,
      scopes: fields.scopes,
      expiresAt: fields.expiresAt,
    })
    .returning({ id: apMapApiToken.id });

  return {
    tokenId: row!.id.toString(),
    label: fields.label,
    scopes: fields.scopes,
    expiresAt: fields.expiresAt?.toISOString() ?? null,
  };
}

/** Commits `api.token_created` and returns the raw bearer token once. */
export async function mintMapApiTokenForAccount(args: {
  mapId: bigint;
  userId: number;
  actorCharacterId: bigint;
  label: string;
  scopes: ApiScope[];
  expiresInDays: number | null;
}): Promise<{ ok: true; token: string; tokenId: string } | { ok: false; error: string }> {
  const { token, hash, prefix } = generateUserApiToken();
  const now = new Date();
  const expiresAt =
    args.expiresInDays === null
      ? null
      : new Date(now.getTime() + args.expiresInDays * DAY_MS);

  try {
    const result = await commitMapEvent({
      mapId: args.mapId,
      characterId: args.actorCharacterId,
      kind: 'api.token_created',
      mutate: async (tx) =>
        mintMapApiTokenInTx(
          tx,
          {
            mapId: args.mapId,
            userId: args.userId,
            label: args.label,
            scopes: args.scopes,
            expiresAt,
            hash,
            prefix,
          },
          now,
        ),
    });
    if (!result.ok) return { ok: false, error: result.error };
    if (result.data.kind !== 'api.token_created') return { ok: false, error: 'Mint failed.' };
    return { ok: true, token, tokenId: result.data.tokenId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not mint.' };
  }
}