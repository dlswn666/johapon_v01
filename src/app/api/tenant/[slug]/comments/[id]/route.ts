export const runtime = 'nodejs';

import { ok, fail, withNoStore, requireAuth, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function PUT(req: Request, context: { params: Promise<{ slug: string; id: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const id = String(params?.id ?? '').trim();

    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));
    if (!id) return withNoStore(fail('BAD_REQUEST', 'invalid id', 400));

    // 권한 체크: Authorization 헤더 필수
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));

    const { content, is_anonymous } = body as any;

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const updateData: any = {
        updated_by: '81600fb2-cae7-4faa-9c65-a30f78508e73', // TODO: 추후 실제 로그인 user uuid로 변경
        updated_at: new Date().toISOString(),
    };

    if (content !== undefined) updateData.content = content;
    if (is_anonymous !== undefined) updateData.is_anonymous = Boolean(is_anonymous);

    const { error } = await supabase.from('comments').update(updateData).eq('id', id).eq('union_id', unionId);

    if (error) {
        return withNoStore(fail('DB_ERROR', `댓글 수정 실패: ${error.message}`, 500));
    }

    return withNoStore(ok({ message: '댓글이 성공적으로 수정되었습니다.' }));
}

export async function DELETE(req: Request, context: { params: Promise<{ slug: string; id: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const id = String(params?.id ?? '').trim();

    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));
    if (!id) return withNoStore(fail('BAD_REQUEST', 'invalid id', 400));

    // 권한 체크: Authorization 헤더 필수
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    // 댓글 정보 먼저 조회 (대상 테이블 및 ID 확인용)
    const { data: comment } = await supabase
        .from('comments')
        .select('target_table, target_id')
        .eq('id', id)
        .eq('union_id', unionId)
        .maybeSingle();

    const { error } = await supabase.from('comments').delete().eq('id', id).eq('union_id', unionId);

    if (error) {
        return withNoStore(fail('DB_ERROR', `댓글 삭제 실패: ${error.message}`, 500));
    }

    // 대상 게시글의 댓글 수 업데이트 (자유게시판의 경우)
    if (comment && comment.target_table === 'community_posts') {
        await supabase.rpc('decrement_comment_count', {
            table_name: 'community_posts',
            row_id: comment.target_id,
        });
    }

    return withNoStore(ok({ message: '댓글이 성공적으로 삭제되었습니다.' }));
}
