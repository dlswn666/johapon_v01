export const runtime = 'nodejs';

import { ok, fail, withNoStore, requireAuth } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';

export async function PATCH(req: Request, context: { params: Promise<{ userId: string }> }) {
    const params = await context.params;
    const userId = String(params?.userId ?? '').trim();
    if (!userId) return withNoStore(fail('BAD_REQUEST', 'invalid userId', 400));

    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));
    const { role, status, name } = body as any;

    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('users')
        .update({
            role: typeof role === 'string' ? role : undefined,
            status: typeof status === 'string' ? status : undefined,
            name: typeof name === 'string' ? name : undefined,
        })
        .eq('id', userId);
    if (error) return withNoStore(fail('DB_ERROR', 'update failed', 500));
    return withNoStore(ok({ updated: true }));
}
