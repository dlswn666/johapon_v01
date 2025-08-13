export const runtime = 'nodejs';

import { ok, fail, withNoStore, isValidSlug, requireAuth } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';

export async function GET(req: Request) {
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const url = new URL(req.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('page_size') ?? '20')));
    if (!Number.isFinite(page) || page < 1) return withNoStore(fail('BAD_REQUEST', 'invalid page', 400));

    const supabase = getSupabaseClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
        .from('unions')
        .select('id, homepage, name, is_expired, contract_end_date', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
    if (error) return withNoStore(fail('DB_ERROR', 'query failed', 500));
    return withNoStore(ok({ items: data ?? [], page, page_size: pageSize, total: count ?? 0 }));
}

export async function POST(req: Request) {
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));
    const { homepage, name, logo_url: logoUrl } = body as any;
    if (!homepage || !name) return withNoStore(fail('BAD_REQUEST', 'homepage and name required', 400));

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('unions')
        .insert({ homepage, name, logo_url: logoUrl ?? null, created_at: new Date().toISOString() })
        .select('id')
        .maybeSingle();
    if (error || !data) return withNoStore(fail('DB_ERROR', 'insert failed', 500));
    return withNoStore(ok({ id: data.id }));
}
