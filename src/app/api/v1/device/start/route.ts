import { serveUserApiDeviceStart, checkDeviceIp } from '@/lib/userApi/device';
import { userApiPublicRoute } from '@/lib/userApi/handler';

/** POST /api/v1/device/start — begin device authorization. */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const route = userApiPublicRoute('device-start', serveUserApiDeviceStart, checkDeviceIp);

export const POST = route.POST;
export const OPTIONS = route.OPTIONS;