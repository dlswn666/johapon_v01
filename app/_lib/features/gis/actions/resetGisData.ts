'use server';

import { createClient } from '@/app/_lib/shared/supabase/server';

// ============================================================
// 타입 정의
// ============================================================

/**
 * GIS 데이터 초기화 결과
 */
export interface ResetGisDataResult {
    success: boolean;
    message?: string;
    error?: string;
    deletedCounts?: {
        syncJobs: number;
        landLots: number;
        buildingUnits: number;
        buildings: number;
        buildingLandLots: number;
    };
}

// ============================================================
// GIS 데이터 초기화 함수
// ============================================================

/**
 * 특정 조합의 모든 GIS 관련 데이터를 초기화(삭제)합니다.
 *
 * 삭제 순서 (외래키 제약 고려):
 * 1. sync_jobs - 해당 조합의 동기화 작업 기록
 * 2. land_lots에서 PNU 목록 추출 (union_id 기준)
 * 3. building_units - 해당 PNU에 연결된 건물 호실 정보
 * 4. building_land_lots - 해당 PNU에 연결된 건물-지번 매핑
 * 5. buildings - 해당 PNU에 연결된 건물 정보 (다른 곳에서 참조하지 않는 것만)
 * 6. land_lots - 해당 조합의 필지 정보
 *
 * @param unionId - 조합 ID
 * @returns 삭제 결과
 */
export async function resetUnionGisData(unionId: string): Promise<ResetGisDataResult> {
    // 필수 파라미터 검증
    if (!unionId) {
        return { success: false, error: '조합 ID가 필요합니다.' };
    }

    // 인증 확인
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: '인증되지 않은 사용자입니다.' };
    }

    console.log(`[GIS Reset] Starting reset for unionId=${unionId}, userId=${user.id}`);

    try {
        const deletedCounts = {
            syncJobs: 0,
            landLots: 0,
            buildingUnits: 0,
            buildings: 0,
            buildingLandLots: 0,
        };

        // 1. 해당 조합의 land_lots에서 PNU 목록 추출
        const { data: landLots, error: fetchError } = await supabase
            .from('land_lots')
            .select('pnu')
            .eq('union_id', unionId);

        if (fetchError) {
            console.error('[GIS Reset] Failed to fetch land_lots:', fetchError);
            throw new Error(`필지 목록 조회 실패: ${fetchError.message}`);
        }

        const pnuList = landLots?.map((lot) => lot.pnu) || [];
        console.log(`[GIS Reset] Found ${pnuList.length} PNUs to process`);

        // 2. sync_jobs 삭제 (GIS_MAP 타입만)
        const { error: syncJobsError, count: syncJobsCount } = await supabase
            .from('sync_jobs')
            .delete({ count: 'exact' })
            .eq('union_id', unionId)
            .eq('job_type', 'GIS_MAP');

        if (syncJobsError) {
            console.error('[GIS Reset] Failed to delete sync_jobs:', syncJobsError);
            throw new Error(`동기화 작업 기록 삭제 실패: ${syncJobsError.message}`);
        }
        deletedCounts.syncJobs = syncJobsCount || 0;
        console.log(`[GIS Reset] Deleted ${deletedCounts.syncJobs} sync_jobs`);

        // 3. 관련 데이터 삭제 (PNU 목록 기준)
        if (pnuList.length > 0) {
            const BATCH_SIZE = 100;

            // 3-1. building_land_lots에서 해당 PNU에 연결된 building_id 조회
            const { data: buildingMappings, error: mappingFetchError } = await supabase
                .from('building_land_lots')
                .select('building_id')
                .in('pnu', pnuList);

            if (mappingFetchError) {
                console.error('[GIS Reset] Failed to fetch building_land_lots:', mappingFetchError);
            }

            const buildingIds = [...new Set(buildingMappings?.map((m) => m.building_id) || [])];
            console.log(`[GIS Reset] Found ${buildingIds.length} buildings linked to these PNUs`);

            // 3-2. building_units 삭제 (buildings에 연결된 것)
            if (buildingIds.length > 0) {
                let totalUnitsDeleted = 0;
                for (let i = 0; i < buildingIds.length; i += BATCH_SIZE) {
                    const batch = buildingIds.slice(i, i + BATCH_SIZE);
                    const { error: unitsError, count: unitsCount } = await supabase
                        .from('building_units')
                        .delete({ count: 'exact' })
                        .in('building_id', batch);

                    if (unitsError) {
                        console.error(`[GIS Reset] Failed to delete building_units batch ${i}:`, unitsError);
                    } else {
                        totalUnitsDeleted += unitsCount || 0;
                    }
                }
                deletedCounts.buildingUnits = totalUnitsDeleted;
                console.log(`[GIS Reset] Deleted ${deletedCounts.buildingUnits} building_units`);
            }

            // 3-3. building_land_lots 매핑 삭제
            let totalMappingsDeleted = 0;
            for (let i = 0; i < pnuList.length; i += BATCH_SIZE) {
                const batch = pnuList.slice(i, i + BATCH_SIZE);
                const { error: mappingError, count: mappingCount } = await supabase
                    .from('building_land_lots')
                    .delete({ count: 'exact' })
                    .in('pnu', batch);

                if (mappingError) {
                    console.error(`[GIS Reset] Failed to delete building_land_lots batch ${i}:`, mappingError);
                } else {
                    totalMappingsDeleted += mappingCount || 0;
                }
            }
            deletedCounts.buildingLandLots = totalMappingsDeleted;
            console.log(`[GIS Reset] Deleted ${deletedCounts.buildingLandLots} building_land_lots`);

            // 3-4. buildings 삭제 (다른 PNU에서 참조하지 않는 것만)
            if (buildingIds.length > 0) {
                // 아직 사용 중인 building_id 확인
                const { data: stillUsed } = await supabase
                    .from('building_land_lots')
                    .select('building_id')
                    .in('building_id', buildingIds);

                const stillUsedSet = new Set(stillUsed?.map((m) => m.building_id) || []);
                const buildingsToDelete = buildingIds.filter((id) => !stillUsedSet.has(id));

                let totalBuildingsDeleted = 0;
                for (let i = 0; i < buildingsToDelete.length; i += BATCH_SIZE) {
                    const batch = buildingsToDelete.slice(i, i + BATCH_SIZE);
                    const { error: buildingsError, count: buildingsCount } = await supabase
                        .from('buildings')
                        .delete({ count: 'exact' })
                        .in('id', batch);

                    if (buildingsError) {
                        console.error(`[GIS Reset] Failed to delete buildings batch ${i}:`, buildingsError);
                    } else {
                        totalBuildingsDeleted += buildingsCount || 0;
                    }
                }
                deletedCounts.buildings = totalBuildingsDeleted;
                console.log(`[GIS Reset] Deleted ${deletedCounts.buildings} buildings`);
            }

            // 3-5. land_lots 삭제 (union_id 기준)
            const { error: landLotsError, count: landLotsCount } = await supabase
                .from('land_lots')
                .delete({ count: 'exact' })
                .eq('union_id', unionId);

            if (landLotsError) {
                console.error('[GIS Reset] Failed to delete land_lots:', landLotsError);
                throw new Error(`필지 정보 삭제 실패: ${landLotsError.message}`);
            }
            deletedCounts.landLots = landLotsCount || 0;
            console.log(`[GIS Reset] Deleted ${deletedCounts.landLots} land_lots`);
        }

        console.log(`[GIS Reset] Reset completed successfully for unionId=${unionId}`);

        return {
            success: true,
            message: `GIS 데이터 초기화가 완료되었습니다. (작업기록: ${deletedCounts.syncJobs}건, 필지: ${deletedCounts.landLots}건, 건물호실: ${deletedCounts.buildingUnits}건, 건물-지번매핑: ${deletedCounts.buildingLandLots}건, 건물: ${deletedCounts.buildings}건)`,
            deletedCounts,
        };
    } catch (error) {
        console.error('[GIS Reset] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'GIS 데이터 초기화에 실패했습니다.',
        };
    }
}
