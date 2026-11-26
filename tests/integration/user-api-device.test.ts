// @vitest-environment node
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '@/db/client';
import { apInstance, apUserApiDevice } from '@/db/schema';
import { POST as startPOST } from '@/app/api/v1/device/start/route';
import { POST as tokenPOST } from '@/app/api/v1/device/token/route';
import { __resetUserApiDeviceRateLimit } from '@/lib/userApi/device';
import { invalidateUserApiInstanceSwitch } from '@/lib/userApi/instance';

const run = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!run)('Device authorization API', () => {
  beforeAll(async () => {
    await migrate(db, { migrationsFolder: 'src/db/migrations' });
    await db
      .insert(apInstance)
      .values({ id: 1, accessMode: 'restricted', userApiEnabled: true })
      .onConflictDoUpdate({
        target: apInstance.id,
        set: { userApiEnabled: true },
      });
  });

  beforeEach(async () => {
    __resetUserApiDeviceRateLimit();
    invalidateUserApiInstanceSwitch();
    await db.delete(apUserApiDevice);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('starts a session and polls pending until approved', async () => {
    const start = await startPOST(
      new NextRequest('http://localhost/api/v1/device/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client: 'eves-little-copilot',
          scopes: ['signatures', 'signatures_write'],
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(start.status).toBe(200);
    const started = await start.json();
    expect(started.ok).toBe(true);
    expect(started.data.deviceCode).toBeTruthy();
    expect(started.data.userCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    const poll = await tokenPOST(
      new NextRequest('http://localhost/api/v1/device/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deviceCode: started.data.deviceCode }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(poll.status).toBe(400);
    const body = await poll.json();
    expect(body.code).toBe('authorization_pending');

    const byUser = await tokenPOST(
      new NextRequest('http://localhost/api/v1/device/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userCode: started.data.userCode }),
      }),
      { params: Promise.resolve({}) },
    );
    const body2 = await byUser.json();
    expect(body2.code).toBe('authorization_pending');
  });
});