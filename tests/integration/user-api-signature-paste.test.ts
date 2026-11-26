// @vitest-environment node
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { and, eq, inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '@/db/client';
import {
  apCharacter,
  apCorporation,
  apInstance,
  apInstanceOwner,
  apMap,
  apMapApiToken,
  apMapSystem,
  apUser,
  universeCategory,
  universeConstellation,
  universeGroup,
  universeRegion,
  universeSystem,
  universeType,
  universeWormhole,
} from '@/db/schema';
import { POST as pastePOST } from '@/app/api/v1/signatures/paste/route';
import {
  clearUserApiAuthCache,
  invalidateUserApiMap,
} from '@/lib/userApi/authorize';
import { __resetUserApiRateLimit } from '@/lib/userApi/rateLimit';
import { generateUserApiToken } from '@/lib/userApi/token';
import { __resetUserApiUsage } from '@/lib/userApi/usage';

const run = process.env.RUN_DB_TESTS === '1';

const CORP = 97349101n;
const MAIN = 97349111n;
const REGION = 97349102;
const CONSTELLATION = 97349103;
const SYSTEM_ID = 97349104;
const SCAN = 'UNO-708\tCosmic Signature\tWormhole\tUnstable Wormhole\t100.0%\t17.43 AU\n';
const MAP_NAME = 'Paste API Map';

describe.skipIf(!run)('POST /api/v1/signatures/paste', () => {
  let mapId = 0n;
  let token = '';

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: 'src/db/migrations' });
    await cleanup();

    await db
      .insert(apInstance)
      .values({ id: 1, accessMode: 'restricted', userApiEnabled: true })
      .onConflictDoUpdate({
        target: apInstance.id,
        set: { userApiEnabled: true },
      });
    await db
      .insert(apInstanceOwner)
      .values({ principalKind: 'corporation', principalId: CORP })
      .onConflictDoNothing();
    await db
      .insert(apCorporation)
      .values({ id: CORP, name: 'Paste API Corp' })
      .onConflictDoUpdate({ target: apCorporation.id, set: { name: 'Paste API Corp' } });
    const [u] = await db.insert(apUser).values({}).returning({ id: apUser.id });
    await db
      .insert(apCharacter)
      .values({
        id: MAIN,
        userId: u!.id,
        name: 'Paste API Main',
        ownerHash: 'paste-api-hash',
        authzLevel: 'member',
        corporationId: CORP,
        allianceId: null,
        status: 'active',
      })
      .onConflictDoUpdate({
        target: apCharacter.id,
        set: {
          userId: u!.id,
          name: 'Paste API Main',
          corporationId: CORP,
          status: 'active',
        },
      });
    await db.update(apUser).set({ mainCharacterId: MAIN }).where(eq(apUser.id, u!.id));
    await db.insert(universeRegion).values({ id: REGION, name: 'API Paste Region' }).onConflictDoNothing();
    await db
      .insert(universeConstellation)
      .values({ id: CONSTELLATION, regionId: REGION, name: 'API Paste Const' })
      .onConflictDoNothing();
    await db
      .insert(universeSystem)
      .values({
        id: SYSTEM_ID,
        name: 'J-API-PASTE',
        constellationId: CONSTELLATION,
        security: 'C4',
      })
      .onConflictDoNothing();
    await db.insert(universeCategory).values({ id: 97349105, name: 'Paste Cat' }).onConflictDoNothing();
    await db
      .insert(universeGroup)
      .values([
        { id: 97349106, categoryId: 97349105, name: 'Wormhole' },
        { id: 97349107, categoryId: 97349105, name: 'Cosmic Signature' },
      ])
      .onConflictDoNothing();
    await db
      .insert(universeType)
      .values([{ id: 97349108, groupId: 97349106, name: 'Unstable Wormhole' }])
      .onConflictDoNothing();
    await db
      .insert(universeWormhole)
      .values({ typeId: 97349108, name: 'X901', sourceClasses: ['H'], targetClass: 'H' })
      .onConflictDoNothing();

    const [map] = await db
      .insert(apMap)
      .values({
        name: MAP_NAME,
        scope: 'wh',
        type: 'corp',
        ownerCorporationId: CORP,
        apiEnabled: true,
        apiScopes: ['signatures_write'],
      })
      .returning({ id: apMap.id });
    mapId = map!.id;
    await db
      .insert(apMapSystem)
      .values({ mapId, systemId: SYSTEM_ID, visible: true, positionX: 0, positionY: 0, status: 'unknown' });

    const minted = generateUserApiToken();
    await db.insert(apMapApiToken).values({
      mapId,
      userId: u!.id,
      tokenHash: minted.hash,
      tokenPrefix: minted.prefix,
      label: 'paste',
      scopes: ['signatures_write'],
    });
    token = minted.token;
  });

  beforeEach(() => {
    __resetUserApiRateLimit();
    __resetUserApiUsage();
    clearUserApiAuthCache();
    invalidateUserApiMap(mapId);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('applies a scanner paste for a system on the map', async () => {
    const res = await pastePOST(
      new NextRequest('http://localhost/api/v1/signatures/paste', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ systemId: SYSTEM_ID, text: SCAN }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.added).toBeGreaterThanOrEqual(1);
  });

  it('returns system_not_on_map for a foreign solar system', async () => {
    const res = await pastePOST(
      new NextRequest('http://localhost/api/v1/signatures/paste', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ systemId: SYSTEM_ID + 1, text: SCAN }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('system_not_on_map');
  });

  it('returns not_scanner_data for garbage text', async () => {
    const res = await pastePOST(
      new NextRequest('http://localhost/api/v1/signatures/paste', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ systemId: SYSTEM_ID, text: 'hello' }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('not_scanner_data');
  });
});

async function cleanup() {
  const maps = await db
    .select({ id: apMap.id })
    .from(apMap)
    .where(eq(apMap.name, MAP_NAME));
  for (const m of maps) {
    await db.delete(apMapApiToken).where(eq(apMapApiToken.mapId, m.id));
    await db.delete(apMapSystem).where(eq(apMapSystem.mapId, m.id));
  }
  await db.delete(apMap).where(eq(apMap.name, MAP_NAME));
  await db
    .delete(apInstanceOwner)
    .where(and(eq(apInstanceOwner.principalKind, 'corporation'), eq(apInstanceOwner.principalId, CORP)));
  const users = await db
    .select({ userId: apCharacter.userId })
    .from(apCharacter)
    .where(eq(apCharacter.id, MAIN));
  await db.delete(apCharacter).where(eq(apCharacter.id, MAIN));
  const userIds = users.map((u) => u.userId);
  if (userIds.length > 0) await db.delete(apUser).where(inArray(apUser.id, userIds));
  await db.delete(apCorporation).where(eq(apCorporation.id, CORP));
}