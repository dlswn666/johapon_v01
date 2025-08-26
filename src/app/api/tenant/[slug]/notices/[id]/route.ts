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
        .from('announcements')
        .select(
            `
            id, title, content, popup, priority, is_urgent, is_pinned,
            published_at, expires_at, view_count, alrimtalk_sent, alrimtalk_sent_at,
            created_at, updated_at, created_by, category_id, subcategory_id
        `
        )
        .eq('union_id', unionId)
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Query error:', error);
        return withSMaxAge(fail('DB_ERROR', `공지사항 조회 실패: ${error.message}`, 500), 30);
    }

    if (!data) {
        return withSMaxAge(fail('NOT_FOUND', '공지사항을 찾을 수 없습니다.', 404), 30);
    }

    // 조회수 증가
    await supabase
        .from('announcements')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id);

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
    const {
        title,
        content,
        popup,
        priority,
        is_urgent,
        is_pinned,
        published_at,
        expires_at,
        category_id: categoryId,
        subcategory_id: subcategoryId,
    } = body as any;

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const updateData: any = {
        updated_by: auth.token,
        updated_at: new Date().toISOString(),
    };

    // 제공된 필드만 업데이트
    if (typeof title === 'string') updateData.title = title;
    if (typeof content === 'string') updateData.content = content;
    if (typeof popup === 'boolean') updateData.popup = popup;
    if (typeof priority === 'number') updateData.priority = priority;
    if (typeof is_urgent === 'boolean') updateData.is_urgent = is_urgent;
    if (typeof is_pinned === 'boolean') updateData.is_pinned = is_pinned;
    if (published_at) updateData.published_at = new Date(published_at).toISOString();
    if (expires_at) updateData.expires_at = new Date(expires_at).toISOString();
    if (categoryId) updateData.category_id = categoryId;
    if (subcategoryId) updateData.subcategory_id = subcategoryId;

    const { error } = await supabase.from('announcements').update(updateData).eq('id', id).eq('union_id', unionId);
    if (error) {
        console.error('Update error:', error);
        return withNoStore(fail('DB_ERROR', `공지사항 수정 실패: ${error.message}`, 500));
    }
    return withNoStore(ok({ updated: true, message: '공지사항이 성공적으로 수정되었습니다.' }));
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

    const { error } = await supabase.from('announcements').delete().eq('id', id).eq('union_id', unionId);
    if (error) {
        console.error('Delete error:', error);
        return withNoStore(fail('DB_ERROR', `공지사항 삭제 실패: ${error.message}`, 500));
    }
    return withNoStore(ok({ deleted: true, message: '공지사항이 성공적으로 삭제되었습니다.' }));
}
