'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';

// 확장된 지번 정보 타입
export interface ExtendedLandLot {
    id: string;
    union_id: string;
    pnu: string;
    address_text: string | null;
    // land_lots 테이블에서 조인된 정보
    land_area: number | null;
    land_category: string | null;
    official_price: number | null;
    owner_count: number | null;
    // buildings 테이블에서 조인된 정보
    building_type: string | null;
}

export interface InfiniteLandLotsResponse {
    lots: ExtendedLandLot[];
    total: number;
    page: number;
    nextPage?: number;
}

interface UseLandLotsInfiniteParams {
    unionId: string | undefined;
    searchQuery?: string;
    pageSize?: number;
}

/**
 * 지번 목록 무한 스크롤 조회 Hook
 */
export function useLandLotsInfinite({ unionId, searchQuery = '', pageSize = 50 }: UseLandLotsInfiniteParams) {
    return useInfiniteQuery<InfiniteLandLotsResponse>({
        queryKey: ['union-land-lots-infinite', unionId, searchQuery],
        queryFn: async ({ pageParam }): Promise<InfiniteLandLotsResponse> => {
            if (!unionId) {
                return { lots: [], total: 0, page: 1 };
            }

            const page = pageParam as number;
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            // union_land_lots에서 기본 데이터 조회
            let query = supabase
                .from('union_land_lots')
                .select('id, union_id, pnu, address_text', { count: 'exact' })
                .eq('union_id', unionId)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (searchQuery) {
                query = query.or(`address_text.ilike.%${searchQuery}%,pnu.ilike.%${searchQuery}%`);
            }

            const { data: lotsData, error: lotsError, count } = await query;
            if (lotsError) {
                throw new Error(`지번 목록 조회 오류: ${lotsError.message}`);
            }

            if (!lotsData || lotsData.length === 0) {
                return { lots: [], total: count || 0, page };
            }

            // PNU 목록 추출
            const pnuList = lotsData.map((lot) => lot.pnu);

            // land_lots에서 추가 정보 조회 (area, land_category, official_price, owner_count)
            const { data: landLotsInfo } = await supabase
                .from('land_lots')
                .select('pnu, area, land_category, official_price, owner_count')
                .in('pnu', pnuList);

            // buildings에서 건물 유형 조회
            const { data: buildingsInfo } = await supabase
                .from('buildings')
                .select('pnu, building_type')
                .in('pnu', pnuList);

            // 데이터 병합
            const extendedLots: ExtendedLandLot[] = lotsData.map((lot) => {
                const landInfo = landLotsInfo?.find((l) => l.pnu === lot.pnu);
                const buildingInfo = buildingsInfo?.find((b) => b.pnu === lot.pnu);

                return {
                    id: lot.id,
                    union_id: lot.union_id,
                    pnu: lot.pnu,
                    address_text: lot.address_text,
                    land_area: landInfo?.area || null,
                    land_category: landInfo?.land_category || null,
                    official_price: landInfo?.official_price || null,
                    owner_count: landInfo?.owner_count || null,
                    building_type: buildingInfo?.building_type || null,
                };
            });

            // 도로(지목='도로')를 가장 아래로 정렬
            extendedLots.sort((a, b) => {
                const aIsRoad = a.land_category === '도로' ? 1 : 0;
                const bIsRoad = b.land_category === '도로' ? 1 : 0;
                return aIsRoad - bIsRoad;
            });

            const total = count || 0;
            const totalPages = Math.ceil(total / pageSize);
            const hasNextPage = page < totalPages;

            return {
                lots: extendedLots,
                total,
                page,
                nextPage: hasNextPage ? page + 1 : undefined,
            };
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.nextPage,
        enabled: !!unionId,
    });
}
