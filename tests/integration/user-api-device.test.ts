// @vitest-environment node
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, pool } from '@/db/client';
import {
  apCharacter,
  apCorporation,
  apInstance,
  apInstanceOwner,
  apMap,
  apMapApiToken,
  apUser,
  apUserApiDevice,
} from '@/db/schema';
import { POST as startPOST } from '@/app/api/v1/device/start/route';
import { POST as tokenPOST } from '@/app/api/v1/device/token/route';
import {
  __resetUserApiDeviceRateLimit,
  decideDeviceAuthorization,
} from '@/lib/userApi/device';
import { invalidateUserApiInstanceSwitch } from '@/lib/userApi/instance';
import { apertureConfig } from '../../aperture.config';

const run = process.env.RUN_DB_TESTS === '1';
const POLL_MS = apertureConfig.USER_API_DEVICE_POLL_INTERVAL_SEC * 1000;
const CORP = 97349201n;
const MAIN = 97349211n;
const MAP_NAME = 'Device API Map';

describe.skipIf(!run)('Device authorization API', () => {
  let userId = 0;
  let mapId = 0n;

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: 'src/db/migrations' });
    await db.delete(apUserApiDevice);
    await db.delete(apMapApiToken);
    const maps = await db.select({ id: apMap.id }).from(apMap).where(eq(apMap.name, MAP_NAME));
    for (const m of maps) {
      await db.delete(apMap).where(eq(apMap.id, m.id));
    }
    await db.delete(apCharacter).where(eq(apCharacter.id, MAIN));
    await db
      .delete(apInstanceOwner)
      .where(and(eq(apInstanceOwner.principalKind, 'corporation'), eq(apInstanceOwner.principalId, CORP)));
    await db.delete(apCorporation).where(eq(apCorporation.id, CORP));

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
      .values({ id: CORP, name: 'Device API Corp' })
      .onConflictDoUpdate({ target: apCorporation.id, set: { name: 'Device API Corp' } });
    const [u] = await db.insert(apUser).values({}).returning({ id: apUser.id });
    userId = u!.id;
    await db
      .insert(apCharacter)
      .values({
        id: MAIN,
        userId,
        name: 'Device Main',
        ownerHash: 'device-api-hash',
        authzLevel: 'member',
        corporationId: CORP,
        allianceId: null,
        status: 'active',
      })
      .onConflictDoUpdate({
        target: apCharacter.id,
        set: { userId, corporationId: CORP, status: 'active' },
      });
    await db.update(apUser).set({ mainCharacterId: MAIN }).where(eq(apUser.id, userId));
    const [map] = await db
      .insert(apMap)
      .values({
        name: MAP_NAME,
        scope: 'wh',
        type: 'corp',
        ownerCorporationId: CORP,
        apiEnabled: true,
        apiScopes: ['signatures', 'signatures_write'],
      })
      .returning({ id: apMap.id });
    mapId = map!.id;
  });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now());
    __resetUserApiDeviceRateLimit();
    invalidateUserApiInstanceSwitch();
    await db.delete(apUserApiDevice);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await pool.end();
  });

  async function startSession() {
    const start = await startPOST(
      new NextRequest('http://localhost/api/v1/device/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
        body: JSON.stringify({
          client: 'eves-little-copilot',
          scopes: ['signatures', 'signatures_write'],
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(start.status).toBe(200);
    const started = await start.json();
    return started.data as { deviceCode: string; userCode: string };
  }

  async function poll(deviceCode: string) {
    return tokenPOST(
      new NextRequest('http://localhost/api/v1/device/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.11' },
        body: JSON.stringify({ deviceCode }),
      }),
      { params: Promise.resolve({}) },
    );
  }

  it('starts a session and polls pending with deviceCode only', async () => {
    const { deviceCode, userCode } = await startSession();
    expect(userCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    const pollRes = await poll(deviceCode);
    expect(pollRes.status).toBe(400);
    const body = await pollRes.json();
    expect(body.code).toBe('authorization_pending');

    const byUser = await tokenPOST(
      new NextRequest('http://localhost/api/v1/device/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userCode }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(byUser.status).toBe(400);
    const body2 = await byUser.json();
    expect(body2.code).toBe('invalid_request');
  });

  it('returns slow_down with Retry-After when polling too fast', async () => {
    const { deviceCode } = await startSession();
    const first = await poll(deviceCode);
    expect(first.status).toBe(400);
    const second = await poll(deviceCode);
    expect(second.status).toBe(429);
    expect(second.headers.get('retry-after')).toBeTruthy();
    const body = await second.json();
    expect(body.code).toBe('slow_down');
  });

  it('delivers the minted token exactly once across poll and approve', async () => {
    const { deviceCode, userCode } = await startSession();
    vi.advanceTimersByTime(POLL_MS + 1);

    const [pollRes, approved] = await Promise.all([
      poll(deviceCode),
      decideDeviceAuthorization({ userCode, mapId: mapId.toString(), approve: true }, userId, MAIN),
    ]);
    const pollWon = pollRes.status === 200;
    const approveWon = approved.ok && 'token' in approved && Boolean(approved.token);
    expect(Number(pollWon) + Number(approveWon)).toBe(1);
    if (pollWon) {
      expect((await pollRes.json()).data.token).toMatch(/^apu_/);
    } else if (approved.ok && 'token' in approved) {
      expect(approved.token).toMatch(/^apu_/);
    }

    vi.advanceTimersByTime(POLL_MS + 1);
    const again = await poll(deviceCode);
    expect(again.status).toBe(400);
    expect((await again.json()).code).toBe('expired_token');

    const [tok] = await db
      .select({ expiresAt: apMapApiToken.expiresAt })
      .from(apMapApiToken)
      .limit(1);
    expect(tok?.expiresAt).toBeTruthy();
    const days = (tok!.expiresAt!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(89);
    expect(days).toBeLessThanOrEqual(90);
  });

  it('denies a pending session', async () => {
    const { deviceCode, userCode } = await startSession();
    vi.advanceTimersByTime(POLL_MS + 1);
    const denied = await decideDeviceAuthorization({ userCode, approve: false }, userId, MAIN);
    expect(denied.ok).toBe(true);

    vi.advanceTimersByTime(POLL_MS + 1);
    const res = await poll(deviceCode);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('access_denied');
  });

  it('allows only one approve to mint', async () => {
    const { userCode } = await startSession();
    const [a, b] = await Promise.all([
      decideDeviceAuthorization({ userCode, mapId: mapId.toString(), approve: true }, userId, MAIN),
      decideDeviceAuthorization({ userCode, mapId: mapId.toString(), approve: true }, userId, MAIN),
    ]);
    const okCount = [a, b].filter((r) => r.ok && 'token' in r && r.token).length;
    expect(okCount).toBe(1);
  });

  it('rejects approve when the main cannot use the map', async () => {
    const { userCode } = await startSession();
    const res = await decideDeviceAuthorization(
      { userCode, mapId: '999999999', approve: true },
      userId,
      MAIN,
    );
    expect(res.ok).toBe(false);
  });

  it('expires pending sessions', async () => {
    const { deviceCode } = await startSession();
    vi.advanceTimersByTime(apertureConfig.USER_API_DEVICE_EXPIRES_MS + 1);
    vi.advanceTimersByTime(POLL_MS + 1);
    const res = await poll(deviceCode);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('expired_token');
  });

  it('consumes on only one concurrent poll after approval', async () => {
    const { deviceCode, userCode } = await startSession();
    vi.advanceTimersByTime(POLL_MS + 1);
    const approvePromise = decideDeviceAuthorization(
      { userCode, mapId: mapId.toString(), approve: true },
      userId,
      MAIN,
    );
    const polls = Promise.all([poll(deviceCode), poll(deviceCode)]);
    await approvePromise;
    vi.advanceTimersByTime(POLL_MS + 1);
    const [a, b] = await polls;
    const wins = [a, b].filter((r) => r.status === 200).length;
    expect(wins).toBeLessThanOrEqual(1);
  });
});