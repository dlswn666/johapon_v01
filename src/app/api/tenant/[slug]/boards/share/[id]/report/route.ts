export const runtime = 'nodejs';

import { fail, withNoStore, isValidSlug, requireAuth } from '@/shared/lib/api';

export async function POST(req: Request, context: { params: Promise<{ slug: string; id: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const id = String(params?.id ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));
    if (!id) return withNoStore(fail('BAD_REQUEST', 'invalid id', 400));

    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    // DB 스키마 미구현 상태
    return withNoStore(fail('NOT_IMPLEMENTED', 'report feature not implemented', 501));
}
