export const runtime = 'nodejs';

import { ok, fail, withNoStore, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));
    const { ad_id: adId, placement } = body as any;
    if (!adId) return withNoStore(fail('BAD_REQUEST', 'ad_id required', 400));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const { error } = await supabase
        .from('ad_impressions')
        .insert({ union_id: unionId, ad_id: adId, placement: placement ?? null, created_at: new Date().toISOString() });
    if (error) return withNoStore(fail('DB_ERROR', 'insert failed', 500));
    return withNoStore(ok({ logged: true }));
}
