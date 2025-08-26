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

    // 권한 체크: Authorization 헤더 필수 (관리자만 답변 가능)
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));

    const { answer_content } = body as any;
    if (!answer_content) return withNoStore(fail('BAD_REQUEST', 'missing answer_content', 400));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    // Q&A 답변 추가
    const { error } = await supabase
        .from('qna')
        .update({
            answer_content,
            is_answered: true,
            answered_at: new Date().toISOString(),
            answered_by: '81600fb2-cae7-4faa-9c65-a30f78508e73', // TODO: 추후 실제 로그인 user uuid로 변경
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('union_id', unionId);

    if (error) {
        return withNoStore(fail('DB_ERROR', `답변 등록 실패: ${error.message}`, 500));
    }

    return withNoStore(ok({ message: '답변이 성공적으로 등록되었습니다.' }));
}
