import { serveUserApiSignaturePaste } from '@/lib/userApi/signaturePaste';
import { userApiMutationRoute } from '@/lib/userApi/handler';

/** POST /api/v1/signatures/paste — probe-scanner lazy-delete paste. */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const route = userApiMutationRoute(
  'signatures-paste',
  'signatures_write',
  serveUserApiSignaturePaste,
);

export const POST = route.POST;
export const OPTIONS = route.OPTIONS;