import { serveUserApiDeviceToken, checkDeviceIp } from '@/lib/userApi/device';
import { userApiPublicRoute } from '@/lib/userApi/handler';

/** POST /api/v1/device/token — poll device authorization or receive a minted token. */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const route = userApiPublicRoute('device-token', serveUserApiDeviceToken, checkDeviceIp);

export const POST = route.POST;
export const OPTIONS = route.OPTIONS;