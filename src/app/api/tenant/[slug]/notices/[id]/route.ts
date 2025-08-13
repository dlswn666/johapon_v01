export const runtime = 'nodejs';

import { ok, fail, withSMaxAge, withNoStore, requireAuth, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function GET(_req: Request, context: { params: Promise<{ slug: string; id: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const id = String(params?.id ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withSMaxAge(fail('BAD_REQUEST', 'invalid slug', 400), 30);
    if (!id) return withSMaxAge(fail('BAD_REQUEST', 'invalid id', 400), 30);

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withSMaxAge(fail('NOT_FOUND', 'union not found', 404), 30);

    const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, popup, created_at, category_id, subcategory_id')
        .eq('union_id', unionId)
        .eq('id', id)
        .maybeSingle();
    if (error) return withSMaxAge(fail('DB_ERROR', 'query failed', 500), 30);
    if (!data) return withSMaxAge(fail('NOT_FOUND', 'not found', 404), 30);
    return withSMaxAge(ok(data), 30);
}

export async function PATCH(req: Request, context: { params: Promise<{ slug: string; id: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const id = String(params?.id ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));
    if (!id) return withNoStore(fail('BAD_REQUEST', 'invalid id', 400));

    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));
    const { title, content, popup, category_id: categoryId, subcategory_id: subcategoryId } = body as any;

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const { error } = await supabase
        .from('posts')
        .update({
            title: typeof title === 'string' ? title : undefined,
            content: typeof content === 'string' ? content : undefined,
            popup: typeof popup === 'boolean' ? popup : undefined,
            category_id: categoryId ?? undefined,
            subcategory_id: subcategoryId ?? undefined,
        })
        .eq('id', id)
        .eq('union_id', unionId);
    if (error) return withNoStore(fail('DB_ERROR', 'update failed', 500));
    return withNoStore(ok({ updated: true }));
}

export async function DELETE(req: Request, context: { params: Promise<{ slug: string; id: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const id = String(params?.id ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));
    if (!id) return withNoStore(fail('BAD_REQUEST', 'invalid id', 400));

    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const { error } = await supabase.from('posts').delete().eq('id', id).eq('union_id', unionId);
    if (error) return withNoStore(fail('DB_ERROR', 'delete failed', 500));
    return withNoStore(ok({ deleted: true }));
}
