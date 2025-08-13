export const runtime = 'nodejs';

import { ok, withNoStore } from '@/shared/lib/api';

export async function GET() {
    return withNoStore(ok({ status: 'ok' }));
}
