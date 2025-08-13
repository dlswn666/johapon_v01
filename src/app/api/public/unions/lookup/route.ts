export const runtime = 'nodejs';

import { ok, fail, withNoStore, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const slug = (url.searchParams.get('slug') ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('unions')
        .select('id, homepage, name, is_expired, contract_end_date')
        .eq('homepage', slug)
        .maybeSingle();

    if (error) return withNoStore(fail('DB_ERROR', 'query failed', 500));
    if (!data) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const active = !(data as any).is_expired;
    return withNoStore(ok({ id: data.id, name: (data as any).name ?? null, active }));
}
