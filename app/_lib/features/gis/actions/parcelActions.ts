'use server';

import { createClient } from '@supabase/supabase-js';
import { escapeLikeWildcards } from '@/app/_lib/shared/utils/escapeLike';

// Supabase Admin 클라이언트 생성
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

export interface UpdateParcelInput {
    pnu: string;
    // land_lots 필드
    owner_count?: number;
    land_area?: number;
    official_price?: number;
    land_category?: string;
    // buildings 필드 (building_id가 있을 경우)
    building_id?: string;
    building_type?: string;
    building_name?: string;
    main_purpose?: string;
    floor_count?: number;
    total_unit_count?: number;
}

export interface DeleteParcelInput {
    pnu: string;
    unionId: string;
}

export interface LinkMemberToParcelInput {
    pnu: string;
    userId: string;
    dong?: string;
    ho?: string;
    buildingUnitId?: string;
    ownershipType?: string;
}

/**
 * 필지 정보 수정 (land_lots + buildings 확장)
 */
export async function updateParcelInfo(input: UpdateParcelInput) {
    const supabase = getSupabaseAdmin();

    // land_lots 업데이트
    const landLotsUpdate: Record<string, number | string | undefined> = {};
    if (input.owner_count !== undefined) landLotsUpdate.owner_count = input.owner_count;
    if (input.land_area !== undefined) landLotsUpdate.area = input.land_area;
    if (input.official_price !== undefined) landLotsUpdate.official_price = input.official_price;
    if (input.land_category !== undefined) landLotsUpdate.land_category = input.land_category;

    if (Object.keys(landLotsUpdate).length > 0) {
        const { error: landError } = await supabase.from('land_lots').update(landLotsUpdate).eq('pnu', input.pnu);

        if (landError) {
            console.error('Update land_lots error:', landError);
            throw new Error(`필지 정보 수정에 실패했습니다: ${landError.message}`);
        }
    }

    // buildings 업데이트 (building_id가 있을 경우)
    if (input.building_id) {
        const buildingsUpdate: Record<string, string | number | undefined> = {};
        if (input.building_type !== undefined) buildingsUpdate.building_type = input.building_type;
        if (input.building_name !== undefined) buildingsUpdate.building_name = input.building_name;
        if (input.main_purpose !== undefined) buildingsUpdate.main_purpose = input.main_purpose;
        if (input.floor_count !== undefined) buildingsUpdate.floor_count = input.floor_count;
        if (input.total_unit_count !== undefined) buildingsUpdate.total_unit_count = input.total_unit_count;

        if (Object.keys(buildingsUpdate).length > 0) {
            const { error: buildingError } = await supabase
                .from('buildings')
                .update(buildingsUpdate)
                .eq('id', input.building_id);

            if (buildingError) {
                console.error('Update buildings error:', buildingError);
                throw new Error(`건물 정보 수정에 실패했습니다: ${buildingError.message}`);
            }
        }
    }

    return { success: true };
}

/**
 * 기존 조합원을 해당 PNU에 연결 (user_property_units upsert)
 */
export async function linkMemberToParcel(input: LinkMemberToParcelInput) {
    const supabase = getSupabaseAdmin();

    // 기존에 동일한 user_id + pnu 조합이 있는지 확인
    const { data: existingUnit, error: checkError } = await supabase
        .from('user_property_units')
        .select('id')
        .eq('user_id', input.userId)
        .eq('pnu', input.pnu)
        .maybeSingle();

    if (checkError) {
        console.error('Check existing unit error:', checkError);
        throw new Error(`조합원 연결 확인에 실패했습니다: ${checkError.message}`);
    }

    const unitData = {
        user_id: input.userId,
        pnu: input.pnu,
        dong: input.dong || null,
        ho: input.ho || null,
        building_unit_id: input.buildingUnitId || null,
        ownership_type: input.ownershipType || 'OWNER',
        is_primary: false, // 연결 시에는 대표가 아닌 것으로 설정
    };

    if (existingUnit) {
        // 업데이트
        const { error: updateError } = await supabase
            .from('user_property_units')
            .update({
                dong: unitData.dong,
                ho: unitData.ho,
                building_unit_id: unitData.building_unit_id,
                ownership_type: unitData.ownership_type,
            })
            .eq('id', existingUnit.id);

        if (updateError) {
            console.error('Update user_property_units error:', updateError);
            throw new Error(`조합원 연결 수정에 실패했습니다: ${updateError.message}`);
        }
    } else {
        // 생성
        const { error: insertError } = await supabase.from('user_property_units').insert(unitData);

        if (insertError) {
            console.error('Insert user_property_units error:', insertError);
            throw new Error(`조합원 연결에 실패했습니다: ${insertError.message}`);
        }
    }

    return { success: true };
}

/**
 * 필지 삭제 (land_lots, 관련 user_consents 삭제)
 * - union_land_lots는 land_lots로 병합됨
 */
export async function deleteParcel(input: DeleteParcelInput) {
    const supabase = getSupabaseAdmin();

    // 1. 해당 PNU에 연결된 조합원들의 동의 정보 삭제
    const { data: propertyUnits, error: usersError } = await supabase
        .from('user_property_units')
        .select(
            `
            user_id,
            users!inner (
                id,
                union_id
            )
        `
        )
        .eq('pnu', input.pnu);

    if (usersError) {
        console.error('Find users error:', usersError);
        throw new Error(`필지 삭제 중 오류가 발생했습니다: ${usersError.message}`);
    }

    // 해당 조합의 사용자만 필터링
    interface UserData {
        id: string;
        union_id: string;
    }

    const users = (propertyUnits || [])
        .filter((pu) => {
            const user = pu.users as unknown as UserData | null;
            return user && user.union_id === input.unionId;
        })
        .map((pu) => {
            const user = pu.users as unknown as UserData;
            return { id: user.id };
        });

    if (users && users.length > 0) {
        const userIds = users.map((u) => u.id);
        const { error: consentsError } = await supabase.from('user_consents').delete().in('user_id', userIds);

        if (consentsError) {
            console.error('Delete user consents error:', consentsError);
            throw new Error(`동의 정보 삭제에 실패했습니다: ${consentsError.message}`);
        }
    }

    // 2. land_lots에서 삭제 (union_id 체크)
    const { error: landLotError } = await supabase
        .from('land_lots')
        .delete()
        .eq('pnu', input.pnu)
        .eq('union_id', input.unionId);

    if (landLotError) {
        console.error('Delete land_lots error:', landLotError);
        throw new Error(`필지 삭제에 실패했습니다: ${landLotError.message}`);
    }

    return { success: true };
}

/**
 * 필지의 조합원 목록 조회 (user_property_units.pnu 기준)
 */
export async function getParcelMembers(pnu: string, unionId: string) {
    const supabase = getSupabaseAdmin();

    // user_property_units 테이블에서 해당 PNU에 연결된 사용자 조회
    const { data: propertyUnits, error } = await supabase
        .from('user_property_units')
        .select(
            `
            pnu,
            property_address_jibun,
            users!inner (
                id,
                name,
                phone_number,
                user_status,
                union_id
            )
        `
        )
        .eq('pnu', pnu);

    if (error) {
        console.error('Get parcel members error:', error);
        throw new Error(`조합원 정보 조회에 실패했습니다: ${error.message}`);
    }

    // 사용자 타입 정의
    interface UserData {
        id: string;
        name: string;
        phone_number: string;
        user_status: string;
        union_id: string;
    }

    // 해당 조합의 승인된 조합원만 필터링하고 결과 형식 변환
    const users = (propertyUnits || [])
        .filter((pu) => {
            const user = pu.users as unknown as UserData | null;
            return user && user.union_id === unionId && user.user_status === 'APPROVED';
        })
        .map((pu) => {
            const user = pu.users as unknown as UserData;
            return {
                id: user.id,
                name: user.name,
                phone_number: user.phone_number,
                property_address_jibun: pu.property_address_jibun,
                property_pnu: pu.pnu,
                user_status: user.user_status,
            };
        });

    return users;
}

/**
 * 조합의 모든 승인된 조합원 목록 조회 (초기 로딩용)
 * user_property_units 테이블에서 PNU가 있는 조합원을 조회
 */
export async function getAllUnionMembers(unionId: string) {
    const supabase = getSupabaseAdmin();

    // 해당 조합의 승인된 사용자 중 user_property_units에 PNU가 있는 사용자 조회
    const { data: propertyUnits, error } = await supabase
        .from('user_property_units')
        .select(
            `
            pnu,
            property_address_jibun,
            users!inner (
                id,
                name,
                phone_number,
                user_status,
                union_id
            )
        `
        )
        .not('pnu', 'is', null);

    if (error) {
        console.error('Get all union members error:', error);
        throw new Error(`조합원 정보 조회에 실패했습니다: ${error.message}`);
    }

    // 사용자 타입 정의
    interface UserData {
        id: string;
        name: string;
        phone_number: string;
        user_status: string;
        union_id: string;
    }

    // 해당 조합의 승인된 조합원만 필터링하고 결과 형식 변환
    const users = (propertyUnits || [])
        .filter((pu) => {
            const user = pu.users as unknown as UserData | null;
            return user && user.union_id === unionId && user.user_status === 'APPROVED';
        })
        .map((pu) => {
            const user = pu.users as unknown as UserData;
            return {
                id: user.id,
                name: user.name,
                phone_number: user.phone_number,
                property_address_jibun: pu.property_address_jibun,
                property_pnu: pu.pnu,
                user_status: user.user_status,
            };
        });

    return users;
}

/**
 * 조합의 소유주 검색 (이름으로 검색, 동명이인 구분을 위해 거주지 표시)
 */
export async function searchUnionMembers(unionId: string, query: string) {
    const supabase = getSupabaseAdmin();

    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, phone_number, resident_address')
        .eq('union_id', unionId)
        .in('user_status', ['APPROVED', 'PRE_REGISTERED'])
        .ilike('name', `%${query}%`)
        .limit(20);

    if (error) {
        console.error('Search union members error:', error);
        throw new Error(`소유주 검색에 실패했습니다: ${error.message}`);
    }

    return users || [];
}

/**
 * 건물 병합: 선택한 건물(source)의 호실을 현재 PNU의 건물(target)로 이동
 * - building_units.building_id를 target으로 update
 * - building_land_lots에서 source를 가리키던 PNU들도 target으로 update
 */
export interface MergeBuildingInput {
    pnu: string; // 현재 모달의 PNU (target building 기준)
    sourceBuildingId: string; // 병합할 소스 건물 ID
}

export interface MergeBuildingResult {
    success: boolean;
    movedUnitsCount: number;
    updatedMappingsCount: number;
    targetBuildingId: string;
}

export async function mergeBuildingIntoPnu(input: MergeBuildingInput): Promise<MergeBuildingResult> {
    const supabase = getSupabaseAdmin();
    const pnu = input.pnu.trim();

    // (a) 현재 PNU의 target building_id 조회
    const { data: currentMapping, error: mappingError } = await supabase
        .from('building_land_lots')
        .select('building_id')
        .eq('pnu', pnu)
        .single();

    if (mappingError || !currentMapping?.building_id) {
        throw new Error('현재 PNU에 연결된 건물이 없습니다. 먼저 건물을 매칭해주세요.');
    }

    const targetBuildingId = currentMapping.building_id;

    // source와 target이 같으면 병합 불필요
    if (targetBuildingId === input.sourceBuildingId) {
        // 안내 처리: 같은 건물을 선택한 경우 병합할 내용이 없으므로 성공 응답으로 종료
        return {
            success: true,
            movedUnitsCount: 0,
            updatedMappingsCount: 0,
            targetBuildingId,
        };
    }

    // (b) building_units에서 source → target으로 이동
    const { data: movedUnits, error: unitsError } = await supabase
        .from('building_units')
        .update({ building_id: targetBuildingId })
        .eq('building_id', input.sourceBuildingId)
        .select('id');

    if (unitsError) {
        console.error('Move building_units error:', unitsError);
        throw new Error(`호실 이동에 실패했습니다: ${unitsError.message}`);
    }

    const movedUnitsCount = movedUnits?.length || 0;

    // (c) building_land_lots에서 source를 가리키던 PNU들도 target으로 update
    const { data: updatedMappings, error: landLotsError } = await supabase
        .from('building_land_lots')
        .update({
            building_id: targetBuildingId,
            previous_building_id: input.sourceBuildingId,
            updated_at: new Date().toISOString(),
        })
        .eq('building_id', input.sourceBuildingId)
        .select('pnu');

    if (landLotsError) {
        console.error('Update building_land_lots error:', landLotsError);
        throw new Error(`PNU 매핑 업데이트에 실패했습니다: ${landLotsError.message}`);
    }

    const updatedMappingsCount = updatedMappings?.length || 0;

    return {
        success: true,
        movedUnitsCount,
        updatedMappingsCount,
        targetBuildingId,
    };
}

// ============================================================================
// 다중 PNU 병합 (Merge Wizard)
// ============================================================================

/**
 * 연동 지번 검색 (조합 내 PNU 검색)
 * - land_lots에서 직접 검색 (union_land_lots 병합됨)
 * - 주소 또는 지번으로 ilike 검색
 * - 현재 모달 PNU 제외
 */
export async function searchLinkedParcels(unionId: string, query: string, excludePnu: string) {
    const supabase = getSupabaseAdmin();

    // 검색어 정규화: 하이픈 제거 버전도 준비 (791-1982 → 7911982)
    const queryNormalized = query.replace(/-/g, '');

    // 1단계: land_lots에서 직접 검색
    // 하이픈 포함/미포함 모두 검색하기 위해 두 가지 쿼리 조합
    const escaped = escapeLikeWildcards(query);
    let orCondition = `address_text.ilike.%${escaped}%,pnu.ilike.%${escaped}%,address.ilike.%${escaped}%`;

    // 하이픈이 있었다면 제거된 버전으로도 검색
    if (query !== queryNormalized) {
        const escapedNormalized = escapeLikeWildcards(queryNormalized);
        orCondition += `,address_text.ilike.%${escapedNormalized}%,pnu.ilike.%${escapedNormalized}%,address.ilike.%${escapedNormalized}%`;
    }

    const { data: landLots, error } = await supabase
        .from('land_lots')
        .select('pnu, address, address_text, road_address')
        .eq('union_id', unionId)
        .neq('pnu', excludePnu)
        .or(orCondition)
        .limit(30);

    if (error) {
        console.error('Search linked parcels error:', error);
        throw new Error(`지번 검색에 실패했습니다: ${error.message}`);
    }

    if (!landLots || landLots.length === 0) {
        return [];
    }

    // 2단계: building_land_lots에서 건물 정보 조회
    const pnuList = landLots.map((ll) => ll.pnu);
    const { data: buildingMappings } = await supabase
        .from('building_land_lots')
        .select('pnu, building_id, buildings(id, building_name, building_type)')
        .in('pnu', pnuList);

    // 결과 조합
    return landLots.map((ll) => {
        const mappingRaw = buildingMappings?.find((m) => m.pnu === ll.pnu);
        const buildingsRaw = mappingRaw?.buildings as unknown;
        const building = Array.isArray(buildingsRaw)
            ? (buildingsRaw[0] as { id: string; building_name: string | null; building_type: string } | undefined)
            : (buildingsRaw as { id: string; building_name: string | null; building_type: string } | null);

        return {
            pnu: ll.pnu,
            address: ll.address_text || ll.address || '',
            road_address: ll.road_address || null,
            building_id: mappingRaw?.building_id || null,
            building_name: building?.building_name || null,
            building_type: building?.building_type || null,
        };
    });
}

/**
 * 다중 PNU 병합: 선택한 PNU들의 호실을 현재 PNU의 건물(target)로 이동
 * - building_units.building_id를 target으로 update하면서 previous_building_id 기록
 * - building_land_lots도 target으로 update하면서 previous_building_id 기록
 */
export interface MergeMultiplePnusInput {
    targetPnu: string; // 현재 모달의 PNU (target building 기준)
    sourcePnus: string[]; // 병합할 소스 PNU 목록
}

export interface MergeMultiplePnusResult {
    success: boolean;
    movedUnitsCount: number;
    updatedMappingsCount: number;
    targetBuildingId: string;
    skippedPnus: string[]; // 매핑이 없거나 이미 같은 건물인 PNU
}

export async function mergeMultiplePnusIntoPnu(input: MergeMultiplePnusInput): Promise<MergeMultiplePnusResult> {
    const supabase = getSupabaseAdmin();
    const targetPnu = input.targetPnu.trim();

    // (a) 현재 PNU의 target building_id 조회
    const { data: currentMapping, error: mappingError } = await supabase
        .from('building_land_lots')
        .select('building_id')
        .eq('pnu', targetPnu)
        .single();

    if (mappingError || !currentMapping?.building_id) {
        throw new Error('현재 PNU에 연결된 건물이 없습니다. 먼저 건물을 매칭해주세요.');
    }

    const targetBuildingId = currentMapping.building_id;
    let totalMovedUnits = 0;
    let totalUpdatedMappings = 0;
    const skippedPnus: string[] = [];

    // (b) 각 source PNU 처리
    for (const sourcePnu of input.sourcePnus) {
        const pnu = sourcePnu.trim();

        // source PNU의 building_id 조회
        const { data: sourceMapping } = await supabase
            .from('building_land_lots')
            .select('building_id')
            .eq('pnu', pnu)
            .maybeSingle();

        if (!sourceMapping?.building_id) {
            skippedPnus.push(pnu);
            continue;
        }

        const sourceBuildingId = sourceMapping.building_id;

        // 같은 건물이면 스킵
        if (sourceBuildingId === targetBuildingId) {
            skippedPnus.push(pnu);
            continue;
        }

        // (c) building_units에서 source → target으로 이동 (previous_building_id 기록)
        const { data: movedUnits, error: unitsError } = await supabase
            .from('building_units')
            .update({
                building_id: targetBuildingId,
                previous_building_id: sourceBuildingId,
            })
            .eq('building_id', sourceBuildingId)
            .select('id');

        if (unitsError) {
            console.error(`Move building_units for ${pnu} error:`, unitsError);
            // 에러가 나도 다음 PNU 진행
            continue;
        }

        totalMovedUnits += movedUnits?.length || 0;

        // (d) building_land_lots에서 source를 가리키던 모든 PNU들을 target으로 update
        const { data: updatedMappings, error: landLotsError } = await supabase
            .from('building_land_lots')
            .update({
                building_id: targetBuildingId,
                previous_building_id: sourceBuildingId,
                updated_at: new Date().toISOString(),
            })
            .eq('building_id', sourceBuildingId)
            .select('pnu');

        if (landLotsError) {
            console.error(`Update building_land_lots for ${pnu} error:`, landLotsError);
            continue;
        }

        totalUpdatedMappings += updatedMappings?.length || 0;

        // (e) user_property_units에서 source PNU → target PNU로 변경 (previous_pnu 기록)
        const { error: userUnitsError } = await supabase
            .from('user_property_units')
            .update({
                pnu: targetPnu,
                previous_pnu: pnu, // 원래 PNU 저장
            })
            .eq('pnu', pnu);

        if (userUnitsError) {
            console.error(`Update user_property_units for ${pnu} error:`, userUnitsError);
            // 에러가 나도 다음 PNU 진행
        }
    }

    return {
        success: true,
        movedUnitsCount: totalMovedUnits,
        updatedMappingsCount: totalUpdatedMappings,
        targetBuildingId,
        skippedPnus,
    };
}

// ============================================================================
// 병합 되돌리기 (Undo Merge)
// ============================================================================

/**
 * 병합 되돌리기: previous_building_id가 있는 호실과 매핑을 원래대로 복원
 * - building_units.building_id = previous_building_id로 복원, previous_building_id = null
 * - building_land_lots도 동일하게 복원
 */
export interface UndoMergeInput {
    targetPnu: string; // 현재 모달의 PNU
}

export interface UndoMergeResult {
    success: boolean;
    restoredUnitsCount: number;
    restoredMappingsCount: number;
    restoredUserUnitsCount?: number;
}

export async function undoMergeForPnu(input: UndoMergeInput): Promise<UndoMergeResult> {
    const supabase = getSupabaseAdmin();
    const pnu = input.targetPnu.trim();

    // (a) 현재 PNU의 building_id 조회
    const { data: currentMapping, error: mappingError } = await supabase
        .from('building_land_lots')
        .select('building_id, previous_building_id')
        .eq('pnu', pnu)
        .single();

    if (mappingError || !currentMapping) {
        throw new Error('현재 PNU에 연결된 건물 정보를 찾을 수 없습니다.');
    }

    const targetBuildingId = currentMapping.building_id;

    // (b) building_units에서 해당 건물 소속 중 previous_building_id가 있는 것을 복원
    // 주의: 모든 previous_building_id 그룹별로 처리
    const { data: unitsToRestore, error: unitsQueryError } = await supabase
        .from('building_units')
        .select('id, previous_building_id')
        .eq('building_id', targetBuildingId)
        .not('previous_building_id', 'is', null);

    if (unitsQueryError) {
        console.error('Query units to restore error:', unitsQueryError);
        throw new Error(`호실 복원 조회에 실패했습니다: ${unitsQueryError.message}`);
    }

    let restoredUnitsCount = 0;

    // 각 유닛을 이전 building으로 복원
    for (const unit of unitsToRestore || []) {
        const { error: unitUpdateError } = await supabase
            .from('building_units')
            .update({
                building_id: unit.previous_building_id,
                previous_building_id: null,
            })
            .eq('id', unit.id);

        if (!unitUpdateError) {
            restoredUnitsCount++;
        }
    }

    // (c) building_land_lots에서 현재 building을 가리키면서 previous가 있는 것들을 복원
    const { data: mappingsToRestore, error: mappingsQueryError } = await supabase
        .from('building_land_lots')
        .select('id, previous_building_id')
        .eq('building_id', targetBuildingId)
        .not('previous_building_id', 'is', null);

    if (mappingsQueryError) {
        console.error('Query mappings to restore error:', mappingsQueryError);
        throw new Error(`매핑 복원 조회에 실패했습니다: ${mappingsQueryError.message}`);
    }

    let restoredMappingsCount = 0;

    for (const mapping of mappingsToRestore || []) {
        const { error: mappingUpdateError } = await supabase
            .from('building_land_lots')
            .update({
                building_id: mapping.previous_building_id,
                previous_building_id: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', mapping.id);

        if (!mappingUpdateError) {
            restoredMappingsCount++;
        }
    }

    // (d) user_property_units에서 previous_pnu가 있는 것들을 복원
    // 현재 target PNU를 가리키면서 previous_pnu가 있는 레코드들을 원래 PNU로 복원
    const { data: userUnitsToRestore, error: userUnitsQueryError } = await supabase
        .from('user_property_units')
        .select('id, previous_pnu')
        .eq('pnu', pnu)
        .not('previous_pnu', 'is', null);

    if (userUnitsQueryError) {
        console.error('Query user_property_units to restore error:', userUnitsQueryError);
        // 에러가 나도 결과 반환
    }

    let restoredUserUnitsCount = 0;

    for (const userUnit of userUnitsToRestore || []) {
        const { error: userUnitUpdateError } = await supabase
            .from('user_property_units')
            .update({
                pnu: userUnit.previous_pnu,
                previous_pnu: null,
            })
            .eq('id', userUnit.id);

        if (!userUnitUpdateError) {
            restoredUserUnitsCount++;
        }
    }

    return {
        success: true,
        restoredUnitsCount,
        restoredMappingsCount,
        restoredUserUnitsCount,
    };
}
