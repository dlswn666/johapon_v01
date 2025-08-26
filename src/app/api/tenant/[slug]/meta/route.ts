export const runtime = 'nodejs';

import { ok, fail, withNoStore, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';

export async function GET(_req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('unions')
        .select('id, homepage, name, logo_url, address, phone, email, created_at, union_chairman, area, union_members')
        .eq('homepage', slug)
        .maybeSingle();
    if (error) {
        console.error('Unions query error:', error);
        return withNoStore(fail('DB_ERROR', `조합 조회 실패: ${error.message}`, 500));
    }
    if (!data) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    // 카테고리 및 서브카테고리 정보 가져오기
    const { data: categories, error: categoriesError } = await supabase
        .from('post_categories')
        .select(
            `
            id, key, name,
            post_subcategories (id, name)
        `
        )
        .or(`union_id.eq.${data.id},union_id.is.null`)
        .order('name');

    if (categoriesError) {
        console.error('Categories query error:', categoriesError);
        return withNoStore(fail('DB_ERROR', `카테고리 조회 실패: ${categoriesError.message}`, 500));
    }

    // 서브카테고리를 카테고리 키와 함께 정리
    const subcategories =
        categories?.flatMap(
            (cat) =>
                cat.post_subcategories?.map((sub: any) => ({
                    id: sub.id,
                    name: sub.name,
                    category_id: cat.id,
                    category_key: cat.key,
                })) || []
        ) || [];

    // 권한 정보는 추후 인증 연동 시 확장
    const features = { notices: true, qna: true, boards_share: true, partners: true, ads: true };
    return withNoStore(
        ok({
            union: data,
            permissions: { role: 'anonymous' },
            features,
            categories: categories || [],
            subcategories,
        })
    );
}
