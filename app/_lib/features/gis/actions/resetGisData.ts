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
        unionLandLots: number;
        buildingUnits: number;
        buildings: number;
        buildingLandLots: number;
        landLots: number;
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
 * 2. union_land_lots에서 PNU 목록 추출
 * 3. union_land_lots - 해당 조합과 연결된 필지 정보
 * 4. building_units - 해당 PNU에 연결된 건물 호실 정보 (다른 조합에서 사용하지 않는 것만)
 * 5. buildings - 해당 PNU에 연결된 건물 정보 (다른 조합에서 사용하지 않는 것만)
 * 6. land_lots - 해당 조합에만 연결된 필지 상세 정보 (다른 조합에서 사용하지 않는 PNU만)
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
            unionLandLots: 0,
            buildingUnits: 0,
            buildings: 0,
            buildingLandLots: 0,
            landLots: 0,
        };

        // 1. 해당 조합의 union_land_lots에서 PNU 목록 추출 (land_lots 삭제 전에 필요)
        const { data: unionLandLots, error: fetchError } = await supabase
            .from('union_land_lots')
            .select('pnu')
            .eq('union_id', unionId);

        if (fetchError) {
            console.error('[GIS Reset] Failed to fetch union_land_lots:', fetchError);
            throw new Error(`필지 목록 조회 실패: ${fetchError.message}`);
        }

        const pnuList = unionLandLots?.map((lot) => lot.pnu) || [];
        console.log(`[GIS Reset] Found ${pnuList.length} PNUs to process`);

        // 2. sync_jobs 삭제
        const { error: syncJobsError, count: syncJobsCount } = await supabase
            .from('sync_jobs')
            .delete({ count: 'exact' })
            .eq('union_id', unionId);

        if (syncJobsError) {
            console.error('[GIS Reset] Failed to delete sync_jobs:', syncJobsError);
            throw new Error(`동기화 작업 기록 삭제 실패: ${syncJobsError.message}`);
        }
        deletedCounts.syncJobs = syncJobsCount || 0;
        console.log(`[GIS Reset] Deleted ${deletedCounts.syncJobs} sync_jobs`);

        // 3. union_land_lots 삭제
        const { error: unionLandLotsError, count: unionLandLotsCount } = await supabase
            .from('union_land_lots')
            .delete({ count: 'exact' })
            .eq('union_id', unionId);

        if (unionLandLotsError) {
            console.error('[GIS Reset] Failed to delete union_land_lots:', unionLandLotsError);
            throw new Error(`조합 필지 연결 정보 삭제 실패: ${unionLandLotsError.message}`);
        }
        deletedCounts.unionLandLots = unionLandLotsCount || 0;
        console.log(`[GIS Reset] Deleted ${deletedCounts.unionLandLots} union_land_lots`);

        // 4. 다른 조합에서 사용하지 않는 PNU 필터링 후 관련 데이터 삭제
        if (pnuList.length > 0) {
            // 다른 조합에서 사용 중인 PNU 조회
            const { data: usedPnus, error: usedPnuError } = await supabase
                .from('union_land_lots')
                .select('pnu')
                .in('pnu', pnuList);

            if (usedPnuError) {
                console.error('[GIS Reset] Failed to check used PNUs:', usedPnuError);
                throw new Error(`사용 중인 PNU 확인 실패: ${usedPnuError.message}`);
            }

            const usedPnuSet = new Set(usedPnus?.map((lot) => lot.pnu) || []);
            const pnusToDelete = pnuList.filter((pnu) => !usedPnuSet.has(pnu));

            console.log(
                `[GIS Reset] ${pnuList.length} PNUs total, ${usedPnuSet.size} still in use, ${pnusToDelete.length} to delete`
            );

            if (pnusToDelete.length > 0) {
                const BATCH_SIZE = 100;

                // 4-1. 해당 PNU에 연결된 buildings ID 조회
                const { data: buildingsData, error: buildingsFetchError } = await supabase
                    .from('buildings')
                    .select('id')
                    .in('pnu', pnusToDelete);

                if (buildingsFetchError) {
                    console.error('[GIS Reset] Failed to fetch buildings:', buildingsFetchError);
                    // 계속 진행 (buildings가 없을 수 있음)
                }

                const buildingIds = buildingsData?.map((b) => b.id) || [];
                console.log(`[GIS Reset] Found ${buildingIds.length} buildings to delete`);

                // 4-2. building_units 삭제 (buildings에 연결된 것)
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

                // 4-3. building_land_lots 매핑 삭제 (해당 PNU에 연결된 것)
                if (pnusToDelete.length > 0) {
                    let totalMappingsDeleted = 0;
                    for (let i = 0; i < pnusToDelete.length; i += BATCH_SIZE) {
                        const batch = pnusToDelete.slice(i, i + BATCH_SIZE);
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
                }

                // 4-4. buildings 삭제
                if (pnusToDelete.length > 0) {
                    let totalBuildingsDeleted = 0;
                    for (let i = 0; i < pnusToDelete.length; i += BATCH_SIZE) {
                        const batch = pnusToDelete.slice(i, i + BATCH_SIZE);
                        const { error: buildingsError, count: buildingsCount } = await supabase
                            .from('buildings')
                            .delete({ count: 'exact' })
                            .in('pnu', batch);

                        if (buildingsError) {
                            console.error(`[GIS Reset] Failed to delete buildings batch ${i}:`, buildingsError);
                        } else {
                            totalBuildingsDeleted += buildingsCount || 0;
                        }
                    }
                    deletedCounts.buildings = totalBuildingsDeleted;
                    console.log(`[GIS Reset] Deleted ${deletedCounts.buildings} buildings`);
                }

                // 4-5. land_lots 삭제
                let totalLandLotsDeleted = 0;
                for (let i = 0; i < pnusToDelete.length; i += BATCH_SIZE) {
                    const batch = pnusToDelete.slice(i, i + BATCH_SIZE);
                    const { error: landLotsError, count: landLotsCount } = await supabase
                        .from('land_lots')
                        .delete({ count: 'exact' })
                        .in('pnu', batch);

                    if (landLotsError) {
                        console.error(`[GIS Reset] Failed to delete land_lots batch ${i}:`, landLotsError);
                    } else {
                        totalLandLotsDeleted += landLotsCount || 0;
                    }
                }
                deletedCounts.landLots = totalLandLotsDeleted;
                console.log(`[GIS Reset] Deleted ${deletedCounts.landLots} land_lots`);
            }
        }

        console.log(`[GIS Reset] Reset completed successfully for unionId=${unionId}`);

        return {
            success: true,
            message: `GIS 데이터 초기화가 완료되었습니다. (작업기록: ${deletedCounts.syncJobs}건, 필지연결: ${deletedCounts.unionLandLots}건, 건물호실: ${deletedCounts.buildingUnits}건, 건물-지번매핑: ${deletedCounts.buildingLandLots}건, 건물: ${deletedCounts.buildings}건, 필지정보: ${deletedCounts.landLots}건)`,
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
