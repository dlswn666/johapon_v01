export const runtime = 'nodejs';

import { ok, fail, withSMaxAge, withNoStore, requireAuth, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function GET(req: Request, context: { params: Promise<{ slug: string; id: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const id = String(params?.id ?? '').trim();

    if (!slug || !isValidSlug(slug)) return withSMaxAge(fail('BAD_REQUEST', 'invalid slug', 400), 30);
    if (!id) return withSMaxAge(fail('BAD_REQUEST', 'invalid id', 400), 30);

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withSMaxAge(fail('NOT_FOUND', 'union not found', 404), 30);

    // Q&A 조회
    const { data, error } = await supabase
        .from('qna')
        .select(
            `
            id, title, content, is_secret, is_answered, answer_content, answered_at, answered_by,
            view_count, created_at, updated_at, category_id, subcategory_id, created_by,
            creator:users!created_by(name),
            answerer:users!answered_by(name)
            `
        )
        .eq('id', id)
        .eq('union_id', unionId)
        .maybeSingle();

    if (error) {
        return withSMaxAge(fail('DB_ERROR', `Q&A 조회 실패: ${error.message}`, 500), 30);
    }

    if (!data) {
        return withSMaxAge(fail('NOT_FOUND', 'Q&A를 찾을 수 없습니다.', 404), 30);
    }

    // 조회수 증가
    await supabase
        .from('qna')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id);

    return withSMaxAge(ok(data), 30);
}

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

    const { title, content, subcategory_id, is_secret } = body as any;

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const updateData: any = {
        updated_by: '81600fb2-cae7-4faa-9c65-a30f78508e73', // TODO: 추후 실제 로그인 user uuid로 변경
        updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (subcategory_id !== undefined) updateData.subcategory_id = subcategory_id;
    if (is_secret !== undefined) updateData.is_secret = Boolean(is_secret);

    const { error } = await supabase.from('qna').update(updateData).eq('id', id).eq('union_id', unionId);

    if (error) {
        return withNoStore(fail('DB_ERROR', `Q&A 수정 실패: ${error.message}`, 500));
    }

    return withNoStore(ok({ message: 'Q&A가 성공적으로 수정되었습니다.' }));
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

    const { error } = await supabase.from('qna').delete().eq('id', id).eq('union_id', unionId);

    if (error) {
        return withNoStore(fail('DB_ERROR', `Q&A 삭제 실패: ${error.message}`, 500));
    }

    return withNoStore(ok({ message: 'Q&A가 성공적으로 삭제되었습니다.' }));
}
