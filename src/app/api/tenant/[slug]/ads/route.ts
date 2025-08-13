export const runtime = 'nodejs';

import { ok, fail, withSMaxAge, withNoStore, requireAuth, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
    const url = new URL(req.url);
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('page_size') ?? '20')));
    if (!slug || !isValidSlug(slug)) return withSMaxAge(fail('BAD_REQUEST', 'invalid slug', 400), 30);
    if (!Number.isFinite(page) || page < 1) return withSMaxAge(fail('BAD_REQUEST', 'invalid page', 400), 30);

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withSMaxAge(fail('NOT_FOUND', 'union not found', 404), 30);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
        .from('ads')
        .select('id, title, image_url, link_url, starts_at, ends_at, created_at', { count: 'exact' })
        .eq('union_id', unionId)
        .order('created_at', { ascending: false })
        .range(from, to);
    if (error) return withSMaxAge(fail('DB_ERROR', 'query failed', 500), 30);
    return withSMaxAge(ok({ items: data ?? [], page, page_size: pageSize, total: count ?? 0 }), 30);
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));
    const { title, image_url: imageUrl, link_url: linkUrl, starts_at: startsAt, ends_at: endsAt } = body as any;
    if (!title || !imageUrl) return withNoStore(fail('BAD_REQUEST', 'title and image_url required', 400));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const { data, error } = await supabase
        .from('ads')
        .insert({
            union_id: unionId,
            title,
            image_url: imageUrl,
            link_url: linkUrl ?? null,
            starts_at: startsAt ?? null,
            ends_at: endsAt ?? null,
            created_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();
    if (error || !data) return withNoStore(fail('DB_ERROR', 'insert failed', 500));
    return withNoStore(ok({ id: data.id }));
}
