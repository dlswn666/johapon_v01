export const runtime = 'nodejs';

import { ok, fail, withSMaxAge, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
    const url = new URL(req.url);
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const categoryKey = url.searchParams.get('category'); // 'qna' 또는 'community'

    if (!slug || !isValidSlug(slug)) {
        return withSMaxAge(fail('BAD_REQUEST', 'invalid slug', 400), 30);
    }

    if (!categoryKey) {
        return withSMaxAge(fail('BAD_REQUEST', 'category parameter required', 400), 30);
    }

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);

    if (!unionId) {
        console.error(`[SUBCATEGORIES_API] Union not found for slug: ${slug}`);
        return withSMaxAge(fail('NOT_FOUND', `Union not found for slug: ${slug}`, 404), 30);
    }

    try {
        // 카테고리 조회
        const { data: category, error: catErr } = await supabase
            .from('post_categories')
            .select('id, name')
            .eq('key', categoryKey)
            .eq('union_id', unionId)
            .maybeSingle();

        if (catErr) {
            console.error(`[SUBCATEGORIES_API] Category query error:`, catErr);
            return withSMaxAge(fail('DB_ERROR', `카테고리 조회 실패: ${catErr.message}`, 500), 30);
        }

        if (!category) {
            console.warn(`[SUBCATEGORIES_API] No category found for key: ${categoryKey}, union_id: ${unionId}`);
            return withSMaxAge(fail('NOT_FOUND', `${categoryKey} 카테고리를 찾을 수 없습니다`, 404), 30);
        }

        // 서브카테고리 조회
        const { data: subcategories, error: subErr } = await supabase
            .from('post_subcategories')
            .select('id, name')
            .eq('category_id', category.id)
            .order('name');

        if (subErr) {
            console.error(`[SUBCATEGORIES_API] Subcategories query error:`, subErr);
            return withSMaxAge(fail('DB_ERROR', `서브카테고리 조회 실패: ${subErr.message}`, 500), 30);
        }

        const responseData = {
            category: {
                id: category.id,
                name: category.name,
                key: categoryKey,
            },
            subcategories: subcategories || [],
        };

        return withSMaxAge(ok(responseData), 300); // 5분 캐시
    } catch (error) {
        return withSMaxAge(fail('SERVER_ERROR', 'Internal server error', 500), 30);
    }
}
