export const runtime = 'nodejs';

import { ok, fail, withSMaxAge, withNoStore, requireAuth, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
    const url = new URL(req.url);
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const targetTable = (url.searchParams.get('target_table') ?? '').trim();
    const targetId = (url.searchParams.get('target_id') ?? '').trim();

    if (!slug || !isValidSlug(slug)) return withSMaxAge(fail('BAD_REQUEST', 'invalid slug', 400), 30);
    if (!targetTable || !targetId)
        return withSMaxAge(fail('BAD_REQUEST', 'missing target_table or target_id', 400), 30);

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withSMaxAge(fail('NOT_FOUND', 'union not found', 404), 30);

    const { data, error, count } = await supabase
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('union_id', unionId)
        .eq('target_table', targetTable)
        .eq('target_id', targetId)
        .order('created_at', { ascending: true });

    if (error) {
        return withSMaxAge(fail('DB_ERROR', `댓글 조회 실패: ${error.message}`, 500), 30);
    }

    return withSMaxAge(ok({ items: data ?? [], total: count ?? 0 }), 30);
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    // 권한 체크: Authorization 헤더 필수
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));

    const { target_table, target_id, content, parent_id = null, is_anonymous = false } = body as any;

    if (!target_table || !target_id || !content) {
        return withNoStore(fail('BAD_REQUEST', 'missing required fields', 400));
    }

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const { data, error } = await supabase
        .from('comments')
        .insert({
            union_id: unionId,
            target_table,
            target_id,
            parent_id,
            content,
            is_anonymous: Boolean(is_anonymous),
            created_by: auth.token, // 인증된 사용자 토큰을 UUID로 저장 (임시)
            created_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();

    if (error || !data) {
        return withNoStore(fail('DB_ERROR', `댓글 등록 실패: ${error?.message || '알 수 없는 오류'}`, 500));
    }

    // 대상 게시글의 댓글 수 업데이트 (자유게시판의 경우)
    if (target_table === 'community_posts') {
        await supabase.rpc('increment_comment_count', {
            table_name: 'community_posts',
            row_id: target_id,
        });
    }

    return withNoStore(
        ok({
            id: data.id,
            message: '댓글이 성공적으로 등록되었습니다.',
        })
    );
}
