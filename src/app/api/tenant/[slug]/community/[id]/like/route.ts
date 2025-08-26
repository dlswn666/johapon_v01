export const runtime = 'nodejs';

import { ok, fail, withNoStore, requireAuth, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function POST(req: Request, context: { params: Promise<{ slug: string; id: string }> }) {
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

    // 기존 좋아요 확인
    const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('target_table', 'community_posts')
        .eq('target_id', id)
        .eq('union_id', unionId)
        .eq('created_by', '81600fb2-cae7-4faa-9c65-a30f78508e73') // TODO: 추후 실제 로그인 user uuid로 변경
        .maybeSingle();

    let liked = false;

    if (existingLike) {
        // 좋아요 취소
        const { error: deleteError } = await supabase.from('post_likes').delete().eq('id', existingLike.id);

        if (deleteError) {
            return withNoStore(fail('DB_ERROR', `좋아요 취소 실패: ${deleteError.message}`, 500));
        }

        // 게시글의 좋아요 수 감소
        const { error: updateError } = await supabase.rpc('decrement_like_count', {
            table_name: 'community_posts',
            row_id: id,
        });

        if (updateError) {
            return withNoStore(fail('DB_ERROR', `좋아요 수 업데이트 실패: ${updateError.message}`, 500));
        }

        liked = false;
    } else {
        // 좋아요 추가
        const { error: insertError } = await supabase.from('post_likes').insert({
            union_id: unionId,
            target_table: 'community_posts',
            target_id: id,
            created_by: '81600fb2-cae7-4faa-9c65-a30f78508e73', // TODO: 추후 실제 로그인 user uuid로 변경
            created_at: new Date().toISOString(),
        });

        if (insertError) {
            return withNoStore(fail('DB_ERROR', `좋아요 추가 실패: ${insertError.message}`, 500));
        }

        // 게시글의 좋아요 수 증가
        const { error: updateError } = await supabase.rpc('increment_like_count', {
            table_name: 'community_posts',
            row_id: id,
        });

        if (updateError) {
            return withNoStore(fail('DB_ERROR', `좋아요 수 업데이트 실패: ${updateError.message}`, 500));
        }

        liked = true;
    }

    return withNoStore(
        ok({
            liked,
            message: liked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.',
        })
    );
}
