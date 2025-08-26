export const runtime = 'nodejs';

import { ok, fail, withSMaxAge, withNoStore, requireAuth, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
    const url = new URL(req.url);
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('page_size') ?? '10')));
    const categoryKey = (url.searchParams.get('category_key') ?? '').trim();
    const subcategoryId = (url.searchParams.get('subcategory_id') ?? '').trim();
    const searchTerm = (url.searchParams.get('search') ?? '').trim();
    const isAnonymous = url.searchParams.get('is_anonymous');

    if (!slug || !isValidSlug(slug)) return withSMaxAge(fail('BAD_REQUEST', 'invalid slug', 400), 30);
    if (!Number.isFinite(page) || page < 1) return withSMaxAge(fail('BAD_REQUEST', 'invalid page', 400), 30);

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withSMaxAge(fail('NOT_FOUND', 'union not found', 404), 30);

    let query = supabase
        .from('community_posts')
        .select(
            `
            id, title, content, view_count, like_count, comment_count, is_anonymous,
            created_at, updated_at, category_id, subcategory_id, created_by
        `,
            { count: 'exact' }
        )
        .eq('union_id', unionId)
        .order('created_at', { ascending: false });

    // 서브카테고리 필터
    if (subcategoryId) {
        query = query.eq('subcategory_id', subcategoryId);
    }

    // 익명 여부 필터
    if (isAnonymous !== null) {
        query = query.eq('is_anonymous', isAnonymous === 'true');
    }

    // 검색 기능 구현
    if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
    }

    // 카테고리 필터
    if (categoryKey) {
        const { data: cat, error: catErr } = await supabase
            .from('post_categories')
            .select('id')
            .eq('union_id', unionId)
            .eq('key', categoryKey)
            .maybeSingle();

        if (catErr) {
            return withSMaxAge(fail('DB_ERROR', `카테고리 조회 실패: ${catErr.message}`, 500), 30);
        }

        if (cat?.id) {
            query = query.eq('category_id', cat.id);
        } else {
            return withSMaxAge(
                ok({
                    items: [],
                    page,
                    page_size: pageSize,
                    total: 0,
                    message: `'${categoryKey}' 카테고리를 찾을 수 없습니다.`,
                }),
                30
            );
        }
    }

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

    // 권한 체크: Authorization 헤더 필수
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));

    const {
        category_id: categoryId,
        subcategory_id: subcategoryId,
        title,
        content,
        is_anonymous = false,
    } = body as any;

    if (!title || !content) return withNoStore(fail('BAD_REQUEST', 'missing title or content', 400));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    // 자유게시판 카테고리 ID 자동 설정 (category_id가 없는 경우)
    let finalCategoryId = categoryId;
    if (!finalCategoryId) {
        const { data: communityCategory } = await supabase
            .from('post_categories')
            .select('id')
            .eq('key', 'community')
            .eq('union_id', unionId)
            .maybeSingle();

        if (!communityCategory) {
            const { data: globalCommunityCategory } = await supabase
                .from('post_categories')
                .select('id')
                .eq('key', 'community')
                .is('union_id', null)
                .maybeSingle();
            finalCategoryId = globalCommunityCategory?.id ?? null;
        } else {
            finalCategoryId = communityCategory.id;
        }
    }

    const { data, error } = await supabase
        .from('community_posts')
        .insert({
            union_id: unionId,
            category_id: finalCategoryId,
            subcategory_id: subcategoryId ?? null,
            title,
            content,
            is_anonymous: Boolean(is_anonymous),
            view_count: 0,
            like_count: 0,
            comment_count: 0,
            created_by: auth.token, // 인증된 사용자 토큰을 UUID로 저장 (임시)
            created_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();

    if (error || !data) {
        return withNoStore(fail('DB_ERROR', `게시글 등록 실패: ${error?.message || '알 수 없는 오류'}`, 500));
    }

    return withNoStore(
        ok({
            id: data.id,
            message: '게시글이 성공적으로 등록되었습니다.',
        })
    );
}
