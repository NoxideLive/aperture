import { and, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { apertureConfig } from '../../../../aperture.config';
import { db } from '@/db/client';
import { apUserApiDevice } from '@/db/schema';
import { withInstrumentation } from '../withInstrumentation';
import type { JobModule } from '../registry';

/**
 * Drops stale `ap_user_api_device` rows: sessions past `expires_at`, and
 * consumed or denied sessions older than `USER_API_DEVICE_RETENTION_DAYS`.
 */

const NAME = 'user-api-device-cleanup';
const DAY_MS = 86_400_000;

async function reap(): Promise<{ deleted: number }> {
  const terminalCutoff = new Date(
    Date.now() - apertureConfig.USER_API_DEVICE_RETENTION_DAYS * DAY_MS,
  );
  let deleted = 0;
  for (;;) {
    const batch = await db
      .delete(apUserApiDevice)
      .where(
        inArray(
          apUserApiDevice.id,
          db
            .select({ id: apUserApiDevice.id })
            .from(apUserApiDevice)
            .where(
              or(
                and(eq(apUserApiDevice.status, 'pending'), lt(apUserApiDevice.expiresAt, sql`now()`)),
                and(
                  inArray(apUserApiDevice.status, ['expired', 'consumed', 'denied']),
                  lt(
                    sql`COALESCE(${apUserApiDevice.consumedAt}, ${apUserApiDevice.deniedAt}, ${apUserApiDevice.expiresAt}, ${apUserApiDevice.createdAt})`,
                    terminalCutoff,
                  ),
                ),
              ),
            )
            .limit(apertureConfig.JOB_DELETE_BATCH_SIZE),
        ),
      )
      .returning({ id: apUserApiDevice.id });
    deleted += batch.length;
    if (batch.length < apertureConfig.JOB_DELETE_BATCH_SIZE) break;
  }
  return { deleted };
}

export const userApiDeviceCleanup: JobModule = {
  name: NAME,
  cron: apertureConfig.USER_API_DEVICE_CLEANUP_CRON,
  run: withInstrumentation(NAME, reap),
};