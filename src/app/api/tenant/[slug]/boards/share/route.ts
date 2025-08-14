export const runtime = 'nodejs';

import { ok, fail, withSMaxAge, withNoStore, requireAuth, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

async function resolveCategoryIdByKey(unionId: string, key: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('post_categories')
        .select('id')
        .eq('union_id', unionId)
        .eq('key', key)
        .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
}

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
    const url = new URL(req.url);
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('page_size') ?? '10')));
    const searchTerm = (url.searchParams.get('search') ?? '').trim();

    if (!slug || !isValidSlug(slug)) return withSMaxAge(fail('BAD_REQUEST', 'invalid slug', 400), 30);
    if (!Number.isFinite(page) || page < 1) return withSMaxAge(fail('BAD_REQUEST', 'invalid page', 400), 30);

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withSMaxAge(fail('NOT_FOUND', 'union not found', 404), 30);

    // 정보공유방 카테고리 ID 조회 (share -> free로 변경)
    let categoryId = await resolveCategoryIdByKey(unionId, 'free');
    if (!categoryId) {
        // 글로벌 카테고리에서 조회
        const { data: globalCategory } = await supabase
            .from('post_categories')
            .select('id')
            .eq('key', 'free')
            .is('union_id', null)
            .maybeSingle();

        if (!globalCategory) {
            return withSMaxAge(
                ok({
                    items: [],
                    page,
                    page_size: pageSize,
                    total: 0,
                    message: '정보공유방 카테고리를 찾을 수 없습니다.',
                }),
                30
            );
        }
        categoryId = globalCategory.id;
    }

    let query = supabase
        .from('posts')
        .select('id, title, content, created_by, created_at, updated_at, category_id, subcategory_id', {
            count: 'exact',
        })
        .eq('union_id', unionId)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false });

    // 검색 기능 구현
    if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
        return withSMaxAge(fail('DB_ERROR', `정보공유방 조회 실패: ${error.message}`, 500), 30);
    }

    return withSMaxAge(ok({ items: data ?? [], page, page_size: pageSize, total: count ?? 0 }), 30);
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    // 권한 체크
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));

    const { subcategory_id: subcategoryId, title, content } = body as any;
    if (!title || !content) return withNoStore(fail('BAD_REQUEST', 'missing title or content', 400));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    // 정보공유방 카테고리 ID 조회 (share -> free로 변경)
    let categoryId = await resolveCategoryIdByKey(unionId, 'free');
    if (!categoryId) {
        const { data: globalCategory } = await supabase
            .from('post_categories')
            .select('id')
            .eq('key', 'free')
            .is('union_id', null)
            .maybeSingle();

        if (!globalCategory) {
            return withNoStore(fail('NOT_FOUND', '정보공유방 카테고리를 찾을 수 없습니다', 404));
        }
        categoryId = globalCategory.id;
    }

    const { data, error } = await supabase
        .from('posts')
        .insert({
            union_id: unionId,
            category_id: categoryId,
            subcategory_id: subcategoryId ?? null,
            title,
            content,
            popup: false,
            created_by: auth.token,
            created_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();

    if (error || !data) {
        return withNoStore(fail('DB_ERROR', `정보공유방 등록 실패: ${error?.message || '알 수 없는 오류'}`, 500));
    }

    return withNoStore(
        ok({
            id: data.id,
            message: '정보공유방 게시글이 성공적으로 등록되었습니다.',
        })
    );
}
