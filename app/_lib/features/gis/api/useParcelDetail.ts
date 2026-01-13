'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';

// 소유주 정보 타입 - users 테이블 기반
export interface Owner {
    id: string;
    name: string;
    phone: string | null;
    resident_address: string | null; // 거주지 주소 (동명이인 구분용)
    share: string | null;
    is_representative: boolean;
    is_manual: boolean;
    consent_status?: 'AGREED' | 'DISAGREED' | 'PENDING';
    consent_date?: string | null;
    property_unit_dong?: string | null;
    property_unit_ho?: string | null;
    ownership_type?: string | null;
    land_area?: number | null;
    building_area?: number | null;
}

// 동의 단계별 현황 타입
export interface ConsentStageStatus {
    stage_id: string;
    stage_name: string;
    stage_code: string;
    required_rate: number;
    total_owners: number;
    agreed_owners: number;
    disagreed_owners: number;
    pending_owners: number;
    consent_rate: number;
    is_completed: boolean;
}

// 건물 유형 한글 매핑
export const BUILDING_TYPE_LABELS: Record<string, string> = {
    DETACHED_HOUSE: '단독',
    VILLA: '다세대/빌라',
    APARTMENT: '아파트',
    COMMERCIAL: '상업',
    MIXED: '복합',
    NONE: '미분류',
};

// 필지 상세 정보 타입
export interface ParcelDetail {
    pnu: string;
    address: string;
    road_address: string | null; // 도로명 주소
    land_area: number | null;
    land_category: string | null; // 지목(지번 타입)
    official_price: number | null;
    building_id: string | null; // 건물 ID (수정 시 필요)
    building_type: string | null;
    building_name: string | null;
    main_purpose: string | null; // 주 용도
    floor_count: number | null; // 층수
    total_unit_count: number | null; // 총 세대수 (buildings 테이블)
    building_units_count: number; // building_units 테이블 COUNT (소유주 수)
    building_units: BuildingUnit[];
    consent_stages: ConsentStageStatus[];
    summary: {
        total_units: number; // building_units 테이블의 실제 unit 개수
        registered_members: number; // 실제 등록된 조합원 수
    };
}

export interface BuildingUnit {
    id: string;
    dong: string | null;
    ho: string | null;
    floor: string | null;
    exclusive_area: number | null;
    owners: Owner[];
}

// 필지 상세 정보 조회 Hook
export const useParcelDetail = (pnu: string | null, stageId: string | null) => {
    // PNU 정규화 (trim)
    const normalizedPnu = pnu?.trim() || null;
    
    return useQuery({
        queryKey: ['parcel-detail', normalizedPnu, stageId],
        queryFn: async (): Promise<ParcelDetail | null> => {
            if (!normalizedPnu) return null;

            // 1. 필지 기본 정보 조회 (land_category, road_address 포함)
            const { data: landLot, error: landError } = await supabase
                .from('land_lots')
                .select('pnu, address, area, official_price, owner_count, land_category, road_address')
                .eq('pnu', normalizedPnu)
                .single();

            if (landError) {
                // 에러 발생 시 throw (규칙 준수)
                throw new Error(`필지 조회 오류: ${landError.message}`);
            }

            // 2. 건물 정보 조회 - building_land_lots를 단일 소스로 사용
            let buildingInfo: {
                id: string;
                building_type: string;
                building_name: string | null;
                main_purpose: string | null;
                floor_count: number | null;
                total_unit_count: number | null;
            } | null = null;

            // building_land_lots에서 PNU로 building_id 조회
            const { data: mapping } = await supabase
                .from('building_land_lots')
                .select('building_id')
                .eq('pnu', normalizedPnu)
                .maybeSingle();

            if (mapping?.building_id) {
                const { data: building } = await supabase
                    .from('buildings')
                    .select('id, building_type, building_name, main_purpose, floor_count, total_unit_count')
                    .eq('id', mapping.building_id)
                    .single();

                if (building) {
                    buildingInfo = building;
                }
            }

            // 2.2. building_units 개수 조회 (소유주 수 계산용)
            let buildingUnitsCount = 0;
            if (buildingInfo?.id) {
                const { count } = await supabase
                    .from('building_units')
                    .select('*', { count: 'exact', head: true })
                    .eq('building_id', buildingInfo.id);
                buildingUnitsCount = count || 0;
            }

            // 3. union_land_lots에서 union_id 조회
            const { data: unionLot } = await supabase
                .from('union_land_lots')
                .select('union_id')
                .eq('pnu', normalizedPnu)
                .limit(1)
                .maybeSingle();

            const unionId = unionLot?.union_id;

            // 4. 해당 PNU와 연결된 소유주(users) 조회 - user_property_units + users + building_units 조인
            interface PropertyUnitWithUser {
                id: string;
                pnu: string | null;
                dong: string | null;
                ho: string | null;
                ownership_type: string | null;
                land_area: number | null;
                building_area: number | null;
                building_unit_id: string | null;
                users: {
                    id: string;
                    name: string;
                    phone_number: string | null;
                    union_id: string | null;
                    user_status: string | null;
                    resident_address: string | null;
                };
            }

            let propertyUnitsWithUsers: PropertyUnitWithUser[] = [];

            if (unionId) {
                const { data: propertyUnits, error: usersError } = await supabase
                    .from('user_property_units')
                    .select(
                        `
                        id,
                        pnu,
                        dong,
                        ho,
                        ownership_type,
                        land_area,
                        building_area,
                        building_unit_id,
                        users!inner (
                            id,
                            name,
                            phone_number,
                            union_id,
                            user_status,
                            resident_address
                        )
                    `
                    )
                    .eq('pnu', normalizedPnu);

                if (usersError) {
                    throw new Error(`조합원 조회 오류: ${usersError.message}`);
                }

                // 해당 조합의 승인된 조합원 및 사전 등록 조합원 필터링
                propertyUnitsWithUsers = (propertyUnits || [])
                    .filter((pu) => {
                        const user = pu.users as unknown as PropertyUnitWithUser['users'];
                        return (
                            user &&
                            user.union_id === unionId &&
                            (user.user_status === 'APPROVED' || user.user_status === 'PRE_REGISTERED')
                        );
                    })
                    .map((pu) => pu as unknown as PropertyUnitWithUser);
            }

            // 4.1. building_units 정보를 building_unit_id로 조회하여 floor/area 정보 보강
            const buildingUnitIds = propertyUnitsWithUsers
                .map((pu) => pu.building_unit_id)
                .filter((id): id is string => !!id);

            let buildingUnitsData: {
                id: string;
                dong: string | null;
                ho: string | null;
                floor: number | null;
                area: number | null;
            }[] = [];

            if (buildingUnitIds.length > 0) {
                const { data: unitsData } = await supabase
                    .from('building_units')
                    .select('id, dong, ho, floor, area')
                    .in('id', buildingUnitIds);

                buildingUnitsData = unitsData || [];
            }

            const buildingUnitsById = new Map(buildingUnitsData.map((u) => [u.id, u]));

            // 5. 동의 단계 목록 조회 (모든 단계)
            const { data: allStages, error: stagesError } = await supabase
                .from('consent_stages')
                .select('id, stage_name, stage_code, required_rate, sort_order')
                .order('sort_order', { ascending: true });

            if (stagesError) {
                throw new Error(`동의 단계 조회 오류: ${stagesError.message}`);
            }

            // 6. 조합원 ID 목록 추출
            const memberIds = propertyUnitsWithUsers.map((pu) => pu.users.id);

            // 7. 조합원별 동의 현황 조회 (user_consents)
            let memberConsents: { user_id: string; stage_id: string; status: string; consent_date: string | null }[] =
                [];
            if (memberIds.length > 0) {
                const { data: consents, error: consentError } = await supabase
                    .from('user_consents')
                    .select('user_id, stage_id, status, consent_date')
                    .in('user_id', memberIds);

                if (consentError) {
                    throw new Error(`동의 현황 조회 오류: ${consentError.message}`);
                }
                memberConsents = consents || [];
            }

            // 8. 조합원 목록 구성 (user_property_units의 dong/ho + building_units 정보 보강)
            const ownersWithConsent: Owner[] = propertyUnitsWithUsers.map((pu) => {
                const user = pu.users;
                const consent = memberConsents.find((c) => c.user_id === user.id && c.stage_id === stageId);

                // building_unit_id가 있으면 해당 정보로 보강
                const buildingUnit = pu.building_unit_id ? buildingUnitsById.get(pu.building_unit_id) : null;

                // dong/ho는 user_property_units에서 우선, 없으면 building_units에서 가져옴
                const dong = pu.dong || buildingUnit?.dong || null;
                const ho = pu.ho || buildingUnit?.ho || null;

                return {
                    id: user.id,
                    name: user.name,
                    phone: user.phone_number,
                    resident_address: user.resident_address,
                    share: null,
                    is_representative: false,
                    is_manual: false,
                    consent_status: (consent?.status as 'AGREED' | 'DISAGREED' | 'PENDING') || 'PENDING',
                    consent_date: consent?.consent_date || null,
                    property_unit_dong: dong,
                    property_unit_ho: ho,
                    ownership_type: pu.ownership_type,
                    land_area: pu.land_area,
                    building_area: pu.building_area,
                };
            });

            // 9. 동의 단계별 통계 계산
            const consentStagesStatus: ConsentStageStatus[] = (allStages || []).map((stage) => {
                let agreed = 0;
                let disagreed = 0;
                let pending = 0;

                memberIds.forEach((memberId) => {
                    const consent = memberConsents.find((c) => c.user_id === memberId && c.stage_id === stage.id);
                    if (consent?.status === 'AGREED') agreed++;
                    else if (consent?.status === 'DISAGREED') disagreed++;
                    else pending++;
                });

                const total = memberIds.length;
                const rate = total > 0 ? Math.round((agreed / total) * 100) : 0;

                return {
                    stage_id: stage.id,
                    stage_name: stage.stage_name,
                    stage_code: stage.stage_code,
                    required_rate: stage.required_rate,
                    total_owners: total,
                    agreed_owners: agreed,
                    disagreed_owners: disagreed,
                    pending_owners: pending,
                    consent_rate: rate,
                    is_completed: rate >= stage.required_rate,
                };
            });

            // 10. 호수별로 그룹화 (building_unit_id 또는 dong+ho 기준)
            const unitMap = new Map<string, BuildingUnit>();
            ownersWithConsent.forEach((owner) => {
                // 그룹 키: dong+ho (빈 문자열도 허용하여 그룹화)
                const unitKey = `${owner.property_unit_dong || ''}-${owner.property_unit_ho || ''}`;

                if (!unitMap.has(unitKey)) {
                    // building_units에서 floor/area 정보 가져오기
                    const matchingPu = propertyUnitsWithUsers.find(
                        (pu) =>
                            (pu.dong || '') === (owner.property_unit_dong || '') &&
                            (pu.ho || '') === (owner.property_unit_ho || '')
                    );
                    const buildingUnit = matchingPu?.building_unit_id
                        ? buildingUnitsById.get(matchingPu.building_unit_id)
                        : null;

                    unitMap.set(unitKey, {
                        id: unitKey,
                        dong: owner.property_unit_dong || null,
                        ho: owner.property_unit_ho || null,
                        floor: buildingUnit?.floor?.toString() || null,
                        exclusive_area: buildingUnit?.area || null,
                        owners: [],
                    });
                }

                unitMap.get(unitKey)!.owners.push(owner);
            });

            const buildingUnits = Array.from(unitMap.values());

            return {
                pnu: normalizedPnu,
                address: landLot?.address || normalizedPnu,
                road_address: landLot?.road_address || null,
                land_area: landLot?.area || null,
                land_category: landLot?.land_category || null,
                official_price: landLot?.official_price || null,
                building_id: buildingInfo?.id || null,
                building_type: buildingInfo?.building_type || null,
                building_name: buildingInfo?.building_name || null,
                main_purpose: buildingInfo?.main_purpose || null,
                floor_count: buildingInfo?.floor_count || null,
                total_unit_count: buildingInfo?.total_unit_count || null,
                building_units_count: buildingUnitsCount, // building_units 테이블 COUNT (소유주 수)
                building_units: buildingUnits,
                consent_stages: consentStagesStatus,
                summary: {
                    total_units: buildingUnitsCount, // building_units 테이블의 실제 개수
                    registered_members: memberIds.length, // 실제 등록된 소유주 수
                },
            };
        },
        enabled: !!normalizedPnu,
        staleTime: 0, // 항상 fresh하게 유지하여 모달 오픈 시 최신 데이터 조회
        refetchOnMount: 'always', // 마운트 시 항상 재조회
    });
};

// 조합 전체 동의율 조회 Hook
export const useUnionConsentRate = (unionId: string | null, stageId: string | null) => {
    return useQuery({
        queryKey: ['union-consent-rate', unionId, stageId],
        queryFn: async () => {
            if (!unionId || !stageId) return null;

            // RPC 함수 호출
            const { data, error } = await supabase.rpc('get_union_consent_rate', {
                p_union_id: unionId,
                p_stage_id: stageId,
            });

            if (error) {
                throw new Error(`동의율 조회 오류: ${error.message}`);
            }

            return data?.[0] || null;
        },
        enabled: !!unionId && !!stageId,
        staleTime: 30000,
    });
};
