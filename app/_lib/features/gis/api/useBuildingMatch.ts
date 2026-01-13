'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import toast from 'react-hot-toast';

// 건물 검색 결과 타입
export interface BuildingSearchResult {
    id: string;
    building_name: string | null;
    building_type: string;
    floor_count: number | null;
    total_unit_count: number | null;
    dong_count: number;
    unit_count: number;
}

// 건물 유닛 Union 타입 (previous + current 표시용)
export interface BuildingUnitWithSource {
    id: string;
    building_id: string;
    dong: string | null;
    ho: string | null;
    floor: number | null;
    area: number | null;
    official_price: number | null;
    source: 'previous' | 'current';
    building_name: string | null;
}

// PNU의 현재 매칭 정보 타입
export interface PnuBuildingMapping {
    id: string;
    pnu: string;
    building_id: string;
    previous_building_id: string | null;
    note: string | null;
    current_building: {
        id: string;
        building_name: string | null;
        building_type: string;
    } | null;
    previous_building: {
        id: string;
        building_name: string | null;
        building_type: string;
    } | null;
}

/**
 * 건물명으로 건물 검색 (동/호수 집계 포함)
 */
export const useBuildingSearch = (keyword: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['building-search', keyword],
        queryFn: async (): Promise<BuildingSearchResult[]> => {
            if (!keyword || keyword.length < 2) return [];

            // 1. 건물명으로 buildings 검색
            const { data: buildings, error } = await supabase
                .from('buildings')
                .select('id, building_name, building_type, floor_count, total_unit_count')
                .ilike('building_name', `%${keyword}%`)
                .limit(20);

            if (error) {
                throw new Error(`건물 검색 오류: ${error.message}`);
            }

            if (!buildings || buildings.length === 0) {
                return [];
            }

            // 2. 각 건물의 동/호수 집계
            const buildingIds = buildings.map((b) => b.id);
            const { data: unitStats, error: statsError } = await supabase
                .from('building_units')
                .select('building_id, dong')
                .in('building_id', buildingIds);

            if (statsError) {
                throw new Error(`유닛 집계 오류: ${statsError.message}`);
            }

            // 집계 계산
            const statsMap = new Map<string, { dongCount: number; unitCount: number }>();
            buildingIds.forEach((id) => statsMap.set(id, { dongCount: 0, unitCount: 0 }));

            if (unitStats) {
                const dongSets = new Map<string, Set<string>>();
                unitStats.forEach((unit) => {
                    const stats = statsMap.get(unit.building_id);
                    if (stats) {
                        stats.unitCount++;
                        if (!dongSets.has(unit.building_id)) {
                            dongSets.set(unit.building_id, new Set());
                        }
                        if (unit.dong) {
                            dongSets.get(unit.building_id)!.add(unit.dong);
                        }
                    }
                });
                dongSets.forEach((dongs, buildingId) => {
                    const stats = statsMap.get(buildingId);
                    if (stats) {
                        stats.dongCount = dongs.size || 1;
                    }
                });
            }

            return buildings.map((b) => ({
                id: b.id,
                building_name: b.building_name,
                building_type: b.building_type,
                floor_count: b.floor_count,
                total_unit_count: b.total_unit_count,
                dong_count: statsMap.get(b.id)?.dongCount || 0,
                unit_count: statsMap.get(b.id)?.unitCount || 0,
            }));
        },
        enabled: enabled && keyword.length >= 2,
        staleTime: 30000,
    });
};

/**
 * PNU의 현재 건물 매칭 정보 조회
 */
export const usePnuBuildingMapping = (pnu: string | null) => {
    return useQuery({
        queryKey: ['pnu-building-mapping', pnu],
        queryFn: async (): Promise<PnuBuildingMapping | null> => {
            if (!pnu) return null;

            const { data, error } = await supabase
                .from('building_land_lots')
                .select(
                    `
                    id,
                    pnu,
                    building_id,
                    previous_building_id,
                    note
                `
                )
                .eq('pnu', pnu)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw new Error(`매핑 조회 오류: ${error.message}`);
            }

            if (!data) return null;

            // 현재/이전 건물 정보 조회
            const buildingIds = [data.building_id, data.previous_building_id].filter(Boolean) as string[];
            let currentBuilding = null;
            let previousBuilding = null;

            if (buildingIds.length > 0) {
                const { data: buildings } = await supabase
                    .from('buildings')
                    .select('id, building_name, building_type')
                    .in('id', buildingIds);

                if (buildings) {
                    currentBuilding = buildings.find((b) => b.id === data.building_id) || null;
                    previousBuilding = buildings.find((b) => b.id === data.previous_building_id) || null;
                }
            }

            return {
                ...data,
                current_building: currentBuilding,
                previous_building: previousBuilding,
            };
        },
        enabled: !!pnu,
    });
};

/**
 * 건물 매칭 변경 (교체) Mutation
 */
export const useUpdateBuildingMatch = () => {
    return useMutation({
        mutationFn: async ({ pnu, newBuildingId, note }: { pnu: string; newBuildingId: string; note?: string }) => {
            // 1. 기존 매핑 조회
            const { data: existingMapping } = await supabase
                .from('building_land_lots')
                .select('id, building_id')
                .eq('pnu', pnu)
                .single();

            const previousBuildingId = existingMapping?.building_id || null;

            // 2. Upsert (pnu unique 제약 활용)
            const { data, error } = await supabase
                .from('building_land_lots')
                .upsert(
                    {
                        pnu,
                        building_id: newBuildingId,
                        previous_building_id: previousBuildingId !== newBuildingId ? previousBuildingId : null,
                        note: note || null,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'pnu' }
                )
                .select()
                .single();

            if (error) {
                throw new Error(`매칭 저장 오류: ${error.message}`);
            }

            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['pnu-building-mapping', variables.pnu] });
            queryClient.invalidateQueries({ queryKey: ['building-units-union', variables.pnu] });
            queryClient.invalidateQueries({ queryKey: ['parcel-detail', variables.pnu] });
            toast.success('건물 매칭이 변경되었습니다.');
        },
        onError: (error: Error) => {
            toast.error(error.message || '매칭 변경에 실패했습니다.');
        },
    });
};

/**
 * PNU의 이전+현재 building_units Union 조회
 */
export const useBuildingUnitsUnion = (pnu: string | null) => {
    return useQuery({
        queryKey: ['building-units-union', pnu],
        queryFn: async (): Promise<BuildingUnitWithSource[]> => {
            if (!pnu) return [];

            // 1. 매핑 정보 조회
            const { data: mapping, error: mappingError } = await supabase
                .from('building_land_lots')
                .select('building_id, previous_building_id')
                .eq('pnu', pnu)
                .single();

            if (mappingError && mappingError.code !== 'PGRST116') {
                throw new Error(`매핑 조회 오류: ${mappingError.message}`);
            }

            if (!mapping) return [];

            // 2. Union 대상 building_id 목록
            const buildingIds = [mapping.building_id, mapping.previous_building_id].filter(Boolean) as string[];
            if (buildingIds.length === 0) return [];

            // 3. building_units 조회
            const { data: units, error: unitsError } = await supabase
                .from('building_units')
                .select('id, building_id, dong, ho, floor, area, official_price')
                .in('building_id', buildingIds);

            if (unitsError) {
                throw new Error(`유닛 조회 오류: ${unitsError.message}`);
            }

            // 4. 건물 이름 조회
            const { data: buildings } = await supabase
                .from('buildings')
                .select('id, building_name')
                .in('id', buildingIds);

            const buildingNameMap = new Map(buildings?.map((b) => [b.id, b.building_name]) || []);

            // 5. source 표시 추가
            return (units || []).map((unit) => ({
                ...unit,
                source: unit.building_id === mapping.building_id ? 'current' : 'previous',
                building_name: buildingNameMap.get(unit.building_id) || null,
            })) as BuildingUnitWithSource[];
        },
        enabled: !!pnu,
    });
};

/**
 * building_unit 삭제 Mutation
 */
export const useDeleteBuildingUnit = () => {
    return useMutation({
        mutationFn: async ({ unitId, pnu }: { unitId: string; pnu: string }) => {
            const { error } = await supabase.from('building_units').delete().eq('id', unitId);

            if (error) {
                throw new Error(`유닛 삭제 오류: ${error.message}`);
            }

            return { unitId, pnu };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['building-units-union', variables.pnu] });
            queryClient.invalidateQueries({ queryKey: ['parcel-detail', variables.pnu] });
            toast.success('호실이 삭제되었습니다.');
        },
        onError: (error: Error) => {
            toast.error(error.message || '삭제에 실패했습니다.');
        },
    });
};

/**
 * 건물 병합 Mutation (서버 액션 호출)
 * 선택한 건물(source)의 호실을 현재 PNU의 건물(target)로 병합
 */
export interface MergeBuildingParams {
    pnu: string;
    sourceBuildingId: string;
}

export interface MergeBuildingResult {
    success: boolean;
    movedUnitsCount: number;
    updatedMappingsCount: number;
    targetBuildingId: string;
}

export const useMergeBuilding = () => {
    return useMutation({
        mutationFn: async ({ pnu, sourceBuildingId }: MergeBuildingParams): Promise<MergeBuildingResult> => {
            // 서버 액션을 동적 import로 호출 (클라이언트 컴포넌트에서 사용)
            const { mergeBuildingIntoPnu } = await import('../actions/parcelActions');
            return mergeBuildingIntoPnu({ pnu, sourceBuildingId });
        },
        // onSuccess, onError는 호출하는 컴포넌트에서 처리
    });
};

// ============================================================================
// 다중 PNU 병합 (Merge Wizard)
// ============================================================================

/**
 * 연동 지번 검색 결과 타입
 */
export interface LinkedParcelResult {
    pnu: string;
    address: string;
    road_address: string | null;
    building_id: string | null;
    building_name: string | null;
    building_type: string | null;
}

/**
 * 연동 지번 검색 훅 (주소/지번으로 검색, 현재 PNU 제외)
 */
export const useLinkedParcelSearch = (
    unionId: string | null,
    query: string,
    excludePnu: string | null,
    enabled: boolean = true
) => {
    return useQuery({
        queryKey: ['linked-parcel-search', unionId, query, excludePnu],
        queryFn: async (): Promise<LinkedParcelResult[]> => {
            if (!unionId || !query || query.length < 2 || !excludePnu) return [];

            const { searchLinkedParcels } = await import('../actions/parcelActions');
            return searchLinkedParcels(unionId, query, excludePnu);
        },
        enabled: enabled && !!unionId && !!excludePnu && query.length >= 2,
        staleTime: 30000,
    });
};

/**
 * 다중 PNU 병합 Mutation
 */
export interface MergeMultiplePnusParams {
    targetPnu: string;
    sourcePnus: string[];
}

export interface MergeMultiplePnusResult {
    success: boolean;
    movedUnitsCount: number;
    updatedMappingsCount: number;
    targetBuildingId: string;
    skippedPnus: string[];
}

export const useMergeMultiplePnus = () => {
    return useMutation({
        mutationFn: async ({ targetPnu, sourcePnus }: MergeMultiplePnusParams): Promise<MergeMultiplePnusResult> => {
            const { mergeMultiplePnusIntoPnu } = await import('../actions/parcelActions');
            return mergeMultiplePnusIntoPnu({ targetPnu, sourcePnus });
        },
        onSuccess: (result, variables) => {
            // 관련 쿼리 무효화
            queryClient.invalidateQueries({ queryKey: ['pnu-building-mapping', variables.targetPnu] });
            queryClient.invalidateQueries({ queryKey: ['building-units-union', variables.targetPnu] });
            queryClient.invalidateQueries({ queryKey: ['parcel-detail', variables.targetPnu], exact: false });
            // source PNU들도 무효화
            variables.sourcePnus.forEach((pnu) => {
                queryClient.invalidateQueries({ queryKey: ['pnu-building-mapping', pnu] });
                queryClient.invalidateQueries({ queryKey: ['building-units-union', pnu] });
                queryClient.invalidateQueries({ queryKey: ['parcel-detail', pnu], exact: false });
            });
            const skippedMsg = result.skippedPnus.length > 0 ? ` (${result.skippedPnus.length}건 스킵)` : '';
            toast.success(`${result.movedUnitsCount}개 호실이 병합되었습니다${skippedMsg}`);
        },
        onError: (error: Error) => {
            toast.error(error.message || '병합에 실패했습니다.');
        },
    });
};

/**
 * 병합 되돌리기 Mutation
 */
export interface UndoMergeResult {
    success: boolean;
    restoredUnitsCount: number;
    restoredMappingsCount: number;
}

export const useUndoMerge = () => {
    return useMutation({
        mutationFn: async ({ targetPnu }: { targetPnu: string }): Promise<UndoMergeResult> => {
            const { undoMergeForPnu } = await import('../actions/parcelActions');
            return undoMergeForPnu({ targetPnu });
        },
        onSuccess: (result, variables) => {
            queryClient.invalidateQueries({ queryKey: ['pnu-building-mapping', variables.targetPnu] });
            queryClient.invalidateQueries({ queryKey: ['building-units-union', variables.targetPnu] });
            queryClient.invalidateQueries({ queryKey: ['parcel-detail', variables.targetPnu], exact: false });
            toast.success(`${result.restoredUnitsCount}개 호실이 복원되었습니다.`);
        },
        onError: (error: Error) => {
            toast.error(error.message || '되돌리기에 실패했습니다.');
        },
    });
};
