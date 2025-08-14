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
        .select('id, title, content, popup, created_at, created_by, category_id, subcategory_id')
        .eq('union_id', unionId)
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Query error:', error);
        return withSMaxAge(fail('DB_ERROR', `게시글 조회 실패: ${error.message}`, 500), 30);
    }

    if (!data) {
        return withSMaxAge(fail('NOT_FOUND', '게시글을 찾을 수 없습니다.', 404), 30);
    }

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
            updated_by: auth.token, // 수정자 정보 추가
            updated_at: new Date().toISOString(), // 수정 시간 업데이트
        })
        .eq('id', id)
        .eq('union_id', unionId);
    if (error) {
        console.error('Update error:', error);
        return withNoStore(fail('DB_ERROR', `게시글 수정 실패: ${error.message}`, 500));
    }
    return withNoStore(ok({ updated: true, message: '게시글이 성공적으로 수정되었습니다.' }));
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
    if (error) {
        console.error('Delete error:', error);
        return withNoStore(fail('DB_ERROR', `게시글 삭제 실패: ${error.message}`, 500));
    }
    return withNoStore(ok({ deleted: true, message: '게시글이 성공적으로 삭제되었습니다.' }));
}
