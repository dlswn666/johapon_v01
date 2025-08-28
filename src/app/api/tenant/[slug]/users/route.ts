export const runtime = 'nodejs';

import { ok, fail, withNoStore, requireAuth, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();

    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('page_size') ?? '20')));
    if (!Number.isFinite(page) || page < 1) return withNoStore(fail('BAD_REQUEST', 'invalid page', 400));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    let query = supabase
        .from('users')
        .select('id, user_id, name, property_location, phone, user_type, is_approved, created_at', { count: 'exact' })
        .eq('union_id', unionId)
        .order('created_at', { ascending: false });

    if (q) query = query.ilike('name', `%${q}%`);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);
    if (error) return withNoStore(fail('DB_ERROR', 'query failed', 500));

    // DB 데이터를 화면용 데이터로 변환
    const transformedData = (data ?? []).map((user: any) => ({
        id: user.id,
        user_id: user.user_id,
        name: user.name,
        address: user.property_location,
        phone: user.phone,
        role: user.user_type,
        status: user.is_approved ? 'active' : 'pending',
        created_at: user.created_at,
    }));

    return withNoStore(ok({ items: transformedData, page, page_size: pageSize, total: count ?? 0 }));
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();

    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));

    const userData = {
        ...body,
        union_id: unionId,
        created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('users').insert([userData]).select().single();
    if (error) return withNoStore(fail('DB_ERROR', 'insert failed', 500));

    return withNoStore(ok({ user: data }));
}
