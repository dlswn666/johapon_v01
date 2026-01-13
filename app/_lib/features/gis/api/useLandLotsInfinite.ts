'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';

// 확장된 지번 정보 타입
export interface ExtendedLandLot {
    pnu: string;
    union_id: string;
    address_text: string | null;
    // land_lots 테이블 필드
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
 * - land_lots 테이블에서 직접 조회 (union_land_lots 병합됨)
 */
export function useLandLotsInfinite({ unionId, searchQuery = '', pageSize = 50 }: UseLandLotsInfiniteParams) {
    return useInfiniteQuery<InfiniteLandLotsResponse>({
        queryKey: ['land-lots-infinite', unionId, searchQuery],
        queryFn: async ({ pageParam }): Promise<InfiniteLandLotsResponse> => {
            if (!unionId) {
                return { lots: [], total: 0, page: 1 };
            }

            const page = pageParam as number;
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            // land_lots에서 직접 조회 (union_id 필터)
            let query = supabase
                .from('land_lots')
                .select('pnu, union_id, address_text, address, area, land_category, official_price, owner_count, created_at', {
                    count: 'exact',
                })
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

            // building_land_lots + buildings 조인으로 건물 유형 조회
            const { data: buildingMappings } = await supabase
                .from('building_land_lots')
                .select('pnu, buildings!inner(building_type)')
                .in('pnu', pnuList);

            // 데이터 병합
            const extendedLots: ExtendedLandLot[] = lotsData.map((lot) => {
                const mappingInfo = buildingMappings?.find((m) => m.pnu === lot.pnu);
                const buildingData = mappingInfo?.buildings as { building_type: string } | undefined;
                const buildingType = buildingData?.building_type || null;

                return {
                    pnu: lot.pnu,
                    union_id: lot.union_id,
                    address_text: lot.address_text || lot.address,
                    land_area: lot.area || null,
                    land_category: lot.land_category || null,
                    official_price: lot.official_price || null,
                    owner_count: lot.owner_count || null,
                    building_type: buildingType,
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
