export const runtime = 'nodejs';

import { ok, fail, withNoStore, withSMaxAge, isValidSlug, requireAuth } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
    const url = new URL(req.url);
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('page_size') ?? '10')));
    const status = (url.searchParams.get('status') ?? '').trim();
    const searchTerm = (url.searchParams.get('search') ?? '').trim();

    if (!slug || !isValidSlug(slug)) return withSMaxAge(fail('BAD_REQUEST', 'invalid slug', 400), 30);
    if (!Number.isFinite(page) || page < 1) return withSMaxAge(fail('BAD_REQUEST', 'invalid page', 400), 30);

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withSMaxAge(fail('NOT_FOUND', 'union not found', 404), 30);

    // QnA 카테고리 ID 조회
    const { data: qnaCategory, error: catErr } = await supabase
        .from('post_categories')
        .select('id')
        .eq('key', 'qna')
        .eq('union_id', unionId)
        .maybeSingle();

    if (catErr) {
        return withSMaxAge(fail('DB_ERROR', `카테고리 조회 실패: ${catErr.message}`, 500), 30);
    }

    if (!qnaCategory?.id) {
        return withSMaxAge(ok({ items: [], page, page_size: pageSize, total: 0 }), 30);
    }

    let query = supabase
        .from('posts')
        .select('id, title, content, created_by, created_at, updated_at, subcategory_id', { count: 'exact' })
        .eq('union_id', unionId)
        .eq('category_id', qnaCategory.id)
        .order('created_at', { ascending: false });

    // 검색 기능 구현
    if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
    }

    // 상태 필터 (추후 확장 가능)
    // if (status && status !== 'all') {
    //     // 답변 여부에 따른 필터링 로직 추가 가능
    // }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
        return withSMaxAge(fail('DB_ERROR', `게시글 조회 실패: ${error.message}`, 500), 30);
    }

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

    const { title, content, subcategory_id: subcategoryId } = body as any;
    if (!title || !content) return withNoStore(fail('BAD_REQUEST', 'missing title or content', 400));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    // QnA 카테고리 ID 조회
    const { data: qnaCategory } = await supabase
        .from('post_categories')
        .select('id')
        .eq('key', 'qna')
        .eq('union_id', unionId)
        .maybeSingle();

    if (!qnaCategory) {
        const { data: globalQnaCategory } = await supabase
            .from('post_categories')
            .select('id')
            .eq('key', 'qna')
            .is('union_id', null)
            .maybeSingle();

        if (!globalQnaCategory) {
            return withNoStore(fail('NOT_FOUND', 'QnA 카테고리를 찾을 수 없습니다', 404));
        }
        var finalCategoryId = globalQnaCategory.id;
    } else {
        var finalCategoryId = qnaCategory.id;
    }

    const { data, error } = await supabase
        .from('posts')
        .insert({
            union_id: unionId,
            category_id: finalCategoryId,
            subcategory_id: subcategoryId ?? null,
            title,
            content,
            popup: false, // QnA는 기본적으로 팝업 아님
            created_by: auth.token,
            created_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();

    if (error || !data) {
        return withNoStore(fail('DB_ERROR', `Q&A 등록 실패: ${error?.message || '알 수 없는 오류'}`, 500));
    }

    return withNoStore(
        ok({
            id: data.id,
            message: 'Q&A가 성공적으로 등록되었습니다.',
        })
    );
}
