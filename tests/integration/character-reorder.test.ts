// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db, pool } from '@/db/client';
import { apCharacter, apUser } from '@/db/schema';

const h = { userId: 0 };

vi.mock('@/lib/session', () => ({
  requireSession: async () => ({ characterId: '91000101', userId: h.userId }),
  assertCharacterOwnership: async () => true,
}));

vi.mock('@/lib/auth', () => ({
  signIn: async () => {},
  signOut: async () => {},
}));

vi.mock('@/lib/auth/link-cookie', () => ({ setLinkCookie: async () => {} }));
vi.mock('@/lib/auth/rights', () => ({ canViewMap: async () => true }));
vi.mock('@/lib/jobs/tracking', () => ({
  startTrackingCharacter: async () => {},
  stopTrackingCharacter: async () => {},
}));

const { reorderCharactersAction } = await import('@/app/(app)/actions/character');

const ZEBRA = 91000101n;
const ALPHA = 91000102n;
const OTHER = 91000103n;

async function orders(userId: number): Promise<string[]> {
  const rows = await db
    .select({ id: apCharacter.id, sortOrder: apCharacter.sortOrder, name: apCharacter.name })
    .from(apCharacter)
    .where(eq(apCharacter.userId, userId))
    .orderBy(apCharacter.sortOrder, apCharacter.name);
  return rows.map((r) => `${r.sortOrder}:${r.name}`);
}

describe('reorderCharactersAction (real Postgres)', () => {
  let userB = 0;

  beforeAll(async () => {
    await db.delete(apCharacter).where(inArray(apCharacter.id, [ZEBRA, ALPHA, OTHER]));
    const [a] = await db.insert(apUser).values({}).returning({ id: apUser.id });
    const [b] = await db.insert(apUser).values({}).returning({ id: apUser.id });
    h.userId = a!.id;
    userB = b!.id;
    await db.insert(apCharacter).values([
      { id: ZEBRA, userId: h.userId, name: 'Zebra', ownerHash: 'rz', status: 'active', sortOrder: 0 },
      { id: ALPHA, userId: h.userId, name: 'Alpha', ownerHash: 'ra', status: 'active', sortOrder: 0 },
      { id: OTHER, userId: userB, name: 'Other', ownerHash: 'ro', status: 'active', sortOrder: 0 },
    ]);
  });

  afterAll(async () => {
    await db.delete(apCharacter).where(inArray(apCharacter.id, [ZEBRA, ALPHA, OTHER]));
    await db.delete(apUser).where(inArray(apUser.id, [h.userId, userB]));
    await pool.end();
  });

  it('rejects a list that is not the whole account', async () => {
    const result = await reorderCharactersAction([ZEBRA.toString()]);
    expect(result).toEqual({ ok: false, error: 'Character list is out of date. Refresh and try again.' });
    expect(await orders(h.userId)).toEqual(['0:Alpha', '0:Zebra']);
  });

  it('persists the given order as sort_order', async () => {
    const result = await reorderCharactersAction([ZEBRA.toString(), ALPHA.toString()]);
    expect(result).toEqual({ ok: true });
    expect(await orders(h.userId)).toEqual(['0:Zebra', '1:Alpha']);
  });
});
