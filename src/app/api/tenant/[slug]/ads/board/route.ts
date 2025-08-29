import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/shared/lib/supabaseServer';
import { ok, fail } from '@/shared/lib/api';

// GET /api/tenant/[slug]/ads/board - 테넌트별 광고 게시판 (모든 광고 열람)
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
    try {
        const { slug } = params;
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '12');
        const search = searchParams.get('search');

        const supabase = getSupabaseServerClient();

        // 조합 정보 조회
        const { data: union, error: unionError } = await supabase
            .from('unions')
            .select('id')
            .eq('homepage', slug)
            .single();

        if (unionError) {
            if (unionError.code === 'PGRST116') {
                return fail('NOT_FOUND', '조합을 찾을 수 없습니다.', 404);
            }
            console.error('[TENANT_ADS_BOARD_API] Union query error:', unionError);
            return fail('DATABASE_ERROR', `조합 조회 실패: ${unionError.message}`, 500);
        }

        const unionId = union.id;
        const today = new Date().toISOString().split('T')[0];

        // 광고 게시판용 쿼리 (공통 광고 + 해당 조합 광고, 모든 게재 위치 포함)
        let query = supabase
            .from('ads')
            .select(
                `
                id,
                title,
                partner_name,
                phone,
                thumbnail_url,
                detail_image_url,
                created_at,
                ad_placements(placement),
                ad_contracts!inner(
                    start_date,
                    end_date,
                    status
                )
            `,
                { count: 'exact' }
            )
            .eq('is_active', true)
            .eq('ad_contracts.status', 'ACTIVE')
            .lte('ad_contracts.start_date', today)
            .gte('ad_contracts.end_date', today)
            .or(`union_id.is.null,union_id.eq.${unionId}`);

        // 검색 필터
        if (search) {
            query = query.or(`title.ilike.%${search}%,partner_name.ilike.%${search}%`);
        }

        // 페이징 적용
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const {
            data: ads,
            error: adsError,
            count,
        } = await query.range(from, to).order('created_at', { ascending: false });

        if (adsError) {
            console.error('[TENANT_ADS_BOARD_API] Ads query error:', adsError);
            return fail('DATABASE_ERROR', `광고 조회 실패: ${adsError.message}`, 500);
        }

        // 데이터 변환 (중복 제거)
        const uniqueAds = new Map();

        (ads || []).forEach((ad: any) => {
            if (!uniqueAds.has(ad.id)) {
                const placements = (ad.ad_placements || []).map((p: any) => p.placement);

                uniqueAds.set(ad.id, {
                    id: ad.id,
                    title: ad.title,
                    partner_name: ad.partner_name,
                    phone: ad.phone,
                    thumbnail_url: ad.thumbnail_url,
                    detail_image_url: ad.detail_image_url,
                    created_at: ad.created_at,
                    placements: placements,
                });
            }
        });

        const result = Array.from(uniqueAds.values());

        return ok({
            items: result,
            total: count || 0,
            hasMore: result.length === pageSize,
            page: page,
            pageSize: pageSize,
        });
    } catch (error) {
        console.error('[TENANT_ADS_BOARD_API] Exception in GET:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}
