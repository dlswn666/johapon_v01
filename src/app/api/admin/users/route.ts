export const runtime = 'nodejs';

import { ok, fail, withNoStore, requireAuth } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';

export async function GET(req: Request) {
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('page_size') ?? '20')));
    if (!Number.isFinite(page) || page < 1) return withNoStore(fail('BAD_REQUEST', 'invalid page', 400));

    const supabase = getSupabaseClient();
    let query = supabase
        .from('users')
        .select('id, user_id, name, role, status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });
    if (q) query = query.ilike('name', `%${q}%`);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);
    if (error) return withNoStore(fail('DB_ERROR', 'query failed', 500));
    return withNoStore(ok({ items: data ?? [], page, page_size: pageSize, total: count ?? 0 }));
}
