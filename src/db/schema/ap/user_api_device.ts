import {
  bigint,
  bigserial,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { apCharacter } from './character';
import { apiDeviceStatus, apiScope } from './enums';
import { apMap } from './map';
import { apMapApiToken } from './map_api_token';
import { apUser } from './user';

// One in-flight device-authorization session. Only the sha256 hex digest of the
// `device_code` is stored. After approval, the raw API token is kept encrypted
// until the client's first successful poll consumes it.
export const apUserApiDevice = pgTable(
  'ap_user_api_device',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    deviceCodeHash: text('device_code_hash').notNull().unique(),
    userCode: text('user_code').notNull().unique(),
    client: text('client').notNull(),
    requestedScopes: apiScope('requested_scopes').array().notNull(),
    status: apiDeviceStatus('status').notNull().default('pending'),
    pollIntervalSec: integer('poll_interval_sec').notNull().default(5),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    deniedAt: timestamp('denied_at', { withTimezone: true }),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    lastPollAt: timestamp('last_poll_at', { withTimezone: true }),
    userId: integer('user_id').references(() => apUser.id, { onDelete: 'set null' }),
    mapId: bigint('map_id', { mode: 'bigint' }).references(() => apMap.id, { onDelete: 'set null' }),
    approvedByCharacterId: bigint('approved_by_character_id', { mode: 'bigint' }).references(
      () => apCharacter.id,
      { onDelete: 'set null' },
    ),
    mintedTokenId: bigint('minted_token_id', { mode: 'bigint' }).references(() => apMapApiToken.id, {
      onDelete: 'set null',
    }),
    mintedTokenEnc: text('minted_token_enc'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ap_user_api_device_expires_at_idx').on(t.expiresAt)],
);