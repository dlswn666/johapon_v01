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
                // 검색어 정규화: 하이픈 제거 버전도 준비 (791-1982 → 7911982)
                const queryNormalized = searchQuery.replace(/-/g, '');

                let orCondition = `address_text.ilike.%${searchQuery}%,pnu.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`;

                // 하이픈이 있었다면 제거된 버전으로도 검색
                if (searchQuery !== queryNormalized) {
                    orCondition += `,address_text.ilike.%${queryNormalized}%,pnu.ilike.%${queryNormalized}%,address.ilike.%${queryNormalized}%`;
                }

                query = query.or(orCondition);
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

            // 1. building_land_lots에서 PNU-building_id 매핑 조회 (조인 없이)
            const { data: buildingMappings } = await supabase
                .from('building_land_lots')
                .select('pnu, building_id')
                .in('pnu', pnuList);

            // 모든 building_id 수집 (단일 순회로 성능 최적화: O(2n) -> O(n))
            const allBuildingIds: string[] = [];
            if (buildingMappings) {
                for (const mapping of buildingMappings) {
                    if (mapping.building_id) {
                        allBuildingIds.push(mapping.building_id);
                    }
                }
            }

            // 2. buildings 테이블에서 건물 유형 별도 조회 (Map 사용)
            const buildingTypeMap = new Map<string, string>();
            if (allBuildingIds.length > 0) {
                const { data: buildingsData } = await supabase
                    .from('buildings')
                    .select('id, building_type')
                    .in('id', allBuildingIds);

                if (buildingsData) {
                    for (const b of buildingsData) {
                        if (b.building_type) {
                            buildingTypeMap.set(b.id, b.building_type);
                        }
                    }
                }
            }

            // 3. building_units 개수 조회 (Map 사용)
            const buildingUnitsCountMap = new Map<string, number>();
            if (allBuildingIds.length > 0) {
                const { data: unitsData } = await supabase
                    .from('building_units')
                    .select('building_id')
                    .in('building_id', allBuildingIds);

                // building_id별 unit 개수 계산
                if (unitsData) {
                    for (const unit of unitsData) {
                        buildingUnitsCountMap.set(unit.building_id, (buildingUnitsCountMap.get(unit.building_id) || 0) + 1);
                    }
                }
            }

            // 4. PNU별 building_units 총 개수 및 건물 유형 계산 (Map 사용)
            const pnuOwnerCountMap = new Map<string, number>();
            const pnuBuildingTypeMap = new Map<string, string>();
            if (buildingMappings) {
                for (const mapping of buildingMappings) {
                    // 소유주 수 합산
                    const currentCount = pnuOwnerCountMap.get(mapping.pnu) || 0;
                    const unitsCount = buildingUnitsCountMap.get(mapping.building_id) || 0;
                    pnuOwnerCountMap.set(mapping.pnu, currentCount + unitsCount);

                    // 건물 유형 (첫 번째 매핑의 건물 유형 사용)
                    if (!pnuBuildingTypeMap.has(mapping.pnu)) {
                        const buildingType = buildingTypeMap.get(mapping.building_id);
                        if (buildingType) {
                            pnuBuildingTypeMap.set(mapping.pnu, buildingType);
                        }
                    }
                }
            }

            // 데이터 병합 (Map.get() O(1) 조회)
            const extendedLots: ExtendedLandLot[] = lotsData.map((lot) => {
                const buildingType = pnuBuildingTypeMap.get(lot.pnu) || null;

                // 소유주 수: building_units 개수 기반으로 계산 (연결된 building이 없으면 null)
                const ownerCount = pnuOwnerCountMap.has(lot.pnu) ? pnuOwnerCountMap.get(lot.pnu)! : null;

                return {
                    pnu: lot.pnu,
                    union_id: lot.union_id,
                    address_text: lot.address_text || lot.address,
                    land_area: lot.area || null,
                    land_category: lot.land_category || null,
                    official_price: lot.official_price || null,
                    owner_count: ownerCount,
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
