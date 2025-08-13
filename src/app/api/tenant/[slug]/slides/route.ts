export const runtime = 'nodejs';

import { ok, fail, withSMaxAge, withNoStore, requireAuth, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
    const url = new URL(req.url);
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const activeOnly = String(url.searchParams.get('active') ?? '').trim() === 'true';
    if (!slug || !isValidSlug(slug)) return withSMaxAge(fail('BAD_REQUEST', 'invalid slug', 400), 30);

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withSMaxAge(fail('NOT_FOUND', 'union not found', 404), 30);

    let query = supabase
        .from('slides')
        .select('id, image_url, link_url, title, starts_at, ends_at, sort_order, created_at')
        .eq('union_id', unionId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (activeOnly) {
        const nowIso = new Date().toISOString();
        query = query.or(`starts_at.is.null,starts_at.lte.${nowIso}`).or(`ends_at.is.null,ends_at.gte.${nowIso}`);
    }

    const { data, error } = await query;
    if (error) return withSMaxAge(fail('DB_ERROR', 'query failed', 500), 30);
    return withSMaxAge(ok({ items: data ?? [] }), 30);
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    // 간단 권한 체크
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));
    const {
        image_url: imageUrl,
        link_url: linkUrl,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        sort_order: sortOrder,
    } = body as any;
    if (!imageUrl || typeof imageUrl !== 'string') return withNoStore(fail('BAD_REQUEST', 'image_url required', 400));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const { data, error } = await supabase
        .from('slides')
        .insert({
            union_id: unionId,
            image_url: imageUrl,
            link_url: linkUrl ?? null,
            title: title ?? null,
            starts_at: startsAt ?? null,
            ends_at: endsAt ?? null,
            sort_order: typeof sortOrder === 'number' ? sortOrder : 0,
            created_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();

    if (error || !data) return withNoStore(fail('DB_ERROR', 'insert failed', 500));
    return withNoStore(ok({ id: data.id }));
}
