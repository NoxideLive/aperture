## userApiDeviceCleanup.ts

**Purpose:** Cron task that deletes expired and aged terminal device-authorization rows from `ap_user_api_device`.
**File:** `src/lib/jobs/tasks/userApiDeviceCleanup.ts`

### reap()
Deletes pending sessions past `expires_at`, and consumed/denied/expired rows older than `USER_API_DEVICE_RETENTION_DAYS`, in `JOB_DELETE_BATCH_SIZE` chunks.