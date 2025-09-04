import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { ok, fail, requireAuth } from '@/shared/lib/api';
import type {
    AdCreateData,
    AdListItem,
    FetchAdsResponse,
    DbAdWithContractSummary,
    DbAdPlacement,
    AdPlacement,
} from '@/entities/advertisement/model/types';

// GET /api/admin/ads - 광고 목록 조회
export async function GET(request: NextRequest) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { searchParams } = new URL(request.url);
        const unionId = searchParams.get('unionId');
        const placement = searchParams.get('placement') as AdPlacement | null;
        const active = searchParams.get('active');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '10');

        const supabase = getSupabaseClient();

        // 기본 쿼리 구성 - placement 필터가 있을 때만 inner join 사용
        const hasPlacementFilter = placement !== null;

        let query = supabase.from('ads').select(
            `
                *,
                placements:ad_placements${hasPlacementFilter ? '!inner' : ''}(placement),
                active_contracts:ad_contracts(
                    id,
                    end_date,
                    status
                )
            `,
            { count: 'exact' }
        );

        // 필터 적용
        if (unionId !== null) {
            if (unionId === 'common') {
                query = query.is('union_id', null);
            } else if (unionId) {
                query = query.eq('union_id', unionId);
            }
        }

        if (active !== null) {
            query = query.eq('is_active', active === 'true');
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,partner_name.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        // 게재 위치 필터 (조인 테이블 필터링)
        if (placement) {
            // 필터는 관계명(ad_placements)을 기준으로 지정해야 함 (응답 별칭과 무관)
            query = query.eq('ad_placements.placement', placement);
        }

        // 페이징 적용
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data: ads, error, count } = await query.range(from, to).order('created_at', { ascending: false });

        if (error) {
            console.error('[ADS_API] Database error:', error);
            return fail('DATABASE_ERROR', `데이터 조회 실패: ${error.message}`, 500);
        }

        // 데이터 변환
        const items: AdListItem[] = (ads || []).map((ad: any) => {
            const placements = (ad.placements || []).map((p: DbAdPlacement) => p.placement);
            const activeContracts = (ad.active_contracts || []).filter((c: any) => c.status === 'ACTIVE');
            const latestEndDate =
                activeContracts.length > 0
                    ? Math.max(...activeContracts.map((c: any) => new Date(c.end_date).getTime()))
                    : null;

            return {
                id: ad.id,
                union_id: ad.union_id,
                title: ad.title,
                partner_name: ad.partner_name,
                phone: ad.phone,
                thumbnail_url: ad.thumbnail_url,
                is_active: ad.is_active,
                placements,
                created_at: ad.created_at,
                active_contracts_count: activeContracts.length,
                latest_contract_end_date: latestEndDate ? new Date(latestEndDate).toISOString().split('T')[0] : null,
            };
        });

        const response: FetchAdsResponse = {
            items,
            total: count || 0,
            hasMore: items.length === pageSize,
        };

        return ok(response);
    } catch (error) {
        console.error('[ADS_API] Exception in GET:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}

// POST /api/admin/ads - 광고 생성
export async function POST(request: NextRequest) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const data: AdCreateData = await request.json();

        // 필수 필드 검증
        if (!data.title || !data.partner_name || !data.phone) {
            return fail('VALIDATION_ERROR', '필수 필드가 누락되었습니다.', 400);
        }

        if (!data.placements || data.placements.length === 0) {
            return fail('VALIDATION_ERROR', '최소 하나의 게재 위치를 선택해야 합니다.', 400);
        }

        // 디바이스별 이미지 및 활성화 검증
        const hasDesktopEnabled = data.desktop_enabled !== false;
        const hasMobileEnabled = data.mobile_enabled !== false;

        if (!hasDesktopEnabled && !hasMobileEnabled) {
            return fail('VALIDATION_ERROR', '적어도 하나의 디바이스가 활성화되어야 합니다.', 400);
        }

        if (hasDesktopEnabled && !data.desktop_image_url && !data.detail_image_url) {
            return fail(
                'VALIDATION_ERROR',
                '데스크톱이 활성화된 경우 데스크톱 이미지 또는 기본 이미지가 필요합니다.',
                400
            );
        }

        if (hasMobileEnabled && !data.mobile_image_url && !data.detail_image_url) {
            return fail('VALIDATION_ERROR', '모바일이 활성화된 경우 모바일 이미지 또는 기본 이미지가 필요합니다.', 400);
        }

        const supabase = getSupabaseClient();

        // 사이드 광고 10개 제한 검증 (활성화된 광고인 경우)
        if (data.is_active !== false && data.placements.includes('SIDE')) {
            // 먼저 SIDE 배치를 가진 광고 ID들을 조회
            const { data: sideAdIds, error: sideAdIdsError } = await supabase
                .from('ad_placements')
                .select('ad_id')
                .eq('placement', 'SIDE');

            if (sideAdIdsError) {
                console.error('[ADS_API] Error fetching side ad IDs:', sideAdIdsError);
                return fail('DATABASE_ERROR', '사이드 광고 ID 조회 중 오류가 발생했습니다.', 500);
            }

            const sideAdIdArray = sideAdIds?.map((item) => item.ad_id) || [];

            if (sideAdIdArray.length > 0) {
                const { count: activeSideAdsCount, error: countError } = await supabase
                    .from('ads')
                    .select('id', { count: 'exact', head: true })
                    .eq('is_active', true)
                    .in('id', sideAdIdArray);

                if (countError) {
                    console.error('[ADS_API] Error counting active side ads:', countError);
                    return fail('DATABASE_ERROR', '활성 광고 개수 확인 중 오류가 발생했습니다.', 500);
                }

                if ((activeSideAdsCount || 0) >= 10) {
                    return fail('VALIDATION_ERROR', '사이드 광고는 최대 10개까지만 활성화할 수 있습니다.', 400);
                }
            }
        }

        // 트랜잭션으로 광고와 게재 위치 동시 생성
        const { data: ad, error: adError } = await supabase
            .from('ads')
            .insert({
                union_id: data.union_id || null,
                title: data.title,
                partner_name: data.partner_name,
                phone: data.phone,
                thumbnail_url: data.thumbnail_url || null,
                detail_image_url: data.detail_image_url || null,
                desktop_image_url: data.desktop_image_url || null,
                mobile_image_url: data.mobile_image_url || null,
                desktop_enabled: data.desktop_enabled ?? true,
                mobile_enabled: data.mobile_enabled ?? true,
                is_active: data.is_active ?? true,
            })
            .select()
            .single();

        if (adError) {
            console.error('[ADS_API] Ad creation error:', adError);
            return fail('DATABASE_ERROR', `광고 생성 실패: ${adError.message}`, 500);
        }

        // 게재 위치 생성
        const placementInserts = data.placements.map((placement) => ({
            ad_id: ad.id,
            placement,
        }));

        const { error: placementError } = await supabase.from('ad_placements').insert(placementInserts);

        if (placementError) {
            console.error('[ADS_API] Placement creation error:', placementError);
            // 광고 롤백
            await supabase.from('ads').delete().eq('id', ad.id);
            return fail('DATABASE_ERROR', `게재 위치 설정 실패: ${placementError.message}`, 500);
        }

        return ok({ id: ad.id, message: '광고가 성공적으로 생성되었습니다.' });
    } catch (error) {
        console.error('[ADS_API] Exception in POST:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}
