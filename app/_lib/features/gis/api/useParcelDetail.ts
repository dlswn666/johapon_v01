'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';

// 조합원(소유주) 정보 타입 - users 테이블 기반
export interface Owner {
    id: string;
    name: string;
    phone: string | null;
    share: string | null;
    is_representative: boolean;
    is_manual: boolean;
    consent_status?: 'AGREED' | 'DISAGREED' | 'PENDING';
    consent_date?: string | null;
    property_unit_dong?: string | null;
    property_unit_ho?: string | null;
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

// 필지 상세 정보 타입
export interface ParcelDetail {
    pnu: string;
    address: string;
    land_area: number | null;
    official_price: number | null;
    building_units: BuildingUnit[];
    consent_stages: ConsentStageStatus[];
    summary: {
        total_units: number;
        total_owners: number;
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
    return useQuery({
        queryKey: ['parcel-detail', pnu, stageId],
        queryFn: async (): Promise<ParcelDetail | null> => {
            if (!pnu) return null;

            // 1. 필지 기본 정보 조회
            const { data: landLot, error: landError } = await supabase
                .from('land_lots')
                .select('pnu, address, area, official_price, owner_count, total_units')
                .eq('pnu', pnu)
                .single();

            if (landError) {
                console.error('필지 조회 오류:', landError);
            }

            // 2. union_land_lots에서 union_id 조회
            const { data: unionLot } = await supabase
                .from('union_land_lots')
                .select('union_id')
                .eq('pnu', pnu)
                .limit(1)
                .single();

            const unionId = unionLot?.union_id;

            // 3. 해당 PNU와 연결된 조합원(users) 조회
            let members: {
                id: string;
                name: string;
                phone_number: string;
                property_unit_dong: string | null;
                property_unit_ho: string | null;
            }[] = [];

            if (unionId) {
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('id, name, phone_number, property_unit_dong, property_unit_ho')
                    .eq('property_pnu', pnu)
                    .eq('union_id', unionId)
                    .eq('user_status', 'APPROVED');

                if (usersError) {
                    console.error('조합원 조회 오류:', usersError);
                }
                members = usersData || [];
            }

            // 4. 동의 단계 목록 조회 (모든 단계)
            const { data: allStages, error: stagesError } = await supabase
                .from('consent_stages')
                .select('id, stage_name, stage_code, required_rate, sort_order')
                .order('sort_order', { ascending: true });

            if (stagesError) {
                console.error('동의 단계 조회 오류:', stagesError);
            }

            // 5. 조합원 ID 목록 추출
            const memberIds = members.map(m => m.id);

            // 6. 조합원별 동의 현황 조회 (user_consents)
            let memberConsents: { user_id: string; stage_id: string; status: string; consent_date: string | null }[] = [];
            if (memberIds.length > 0) {
                const { data: consents, error: consentError } = await supabase
                    .from('user_consents')
                    .select('user_id, stage_id, status, consent_date')
                    .in('user_id', memberIds);

                if (consentError) {
                    console.error('동의 현황 조회 오류:', consentError);
                }
                memberConsents = consents || [];
            }

            // 7. 조합원에게 현재 선택된 단계의 동의 상태 추가
            const ownersWithConsent: Owner[] = members.map(member => {
                const consent = memberConsents.find(
                    c => c.user_id === member.id && c.stage_id === stageId
                );
                return {
                    id: member.id,
                    name: member.name,
                    phone: member.phone_number,
                    share: null,
                    is_representative: false,
                    is_manual: false,
                    consent_status: (consent?.status as 'AGREED' | 'DISAGREED' | 'PENDING') || 'PENDING',
                    consent_date: consent?.consent_date || null,
                    property_unit_dong: member.property_unit_dong,
                    property_unit_ho: member.property_unit_ho,
                };
            });

            // 8. 동의 단계별 통계 계산
            const consentStagesStatus: ConsentStageStatus[] = (allStages || []).map(stage => {
                let agreed = 0;
                let disagreed = 0;
                let pending = 0;

                memberIds.forEach(memberId => {
                    const consent = memberConsents.find(
                        c => c.user_id === memberId && c.stage_id === stage.id
                    );
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
                    is_completed: rate >= stage.required_rate
                };
            });

            // 9. 호수별로 그룹화 (building_units 호환성 유지)
            const unitMap = new Map<string, BuildingUnit>();
            ownersWithConsent.forEach(owner => {
                const unitKey = `${owner.property_unit_dong || ''}-${owner.property_unit_ho || ''}`;
                
                if (!unitMap.has(unitKey)) {
                    unitMap.set(unitKey, {
                        id: unitKey,
                        dong: owner.property_unit_dong || null,
                        ho: owner.property_unit_ho || null,
                        floor: null,
                        exclusive_area: null,
                        owners: []
                    });
                }
                
                unitMap.get(unitKey)!.owners.push(owner);
            });

            const buildingUnits = Array.from(unitMap.values());

            return {
                pnu,
                address: landLot?.address || pnu,
                land_area: landLot?.area || null,
                official_price: landLot?.official_price || null,
                building_units: buildingUnits,
                consent_stages: consentStagesStatus,
                summary: {
                    total_units: landLot?.total_units || buildingUnits.length,
                    total_owners: landLot?.owner_count || memberIds.length
                }
            };
        },
        enabled: !!pnu,
        staleTime: 30000, // 30초 동안 캐시 유지
    });
};

// 조합 전체 동의율 조회 Hook
export const useUnionConsentRate = (unionId: string | null, stageId: string | null) => {
    return useQuery({
        queryKey: ['union-consent-rate', unionId, stageId],
        queryFn: async () => {
            if (!unionId || !stageId) return null;

            // RPC 함수 호출
            const { data, error } = await supabase
                .rpc('get_union_consent_rate', {
                    p_union_id: unionId,
                    p_stage_id: stageId
                });

            if (error) {
                console.error('동의율 조회 오류:', error);
                return null;
            }

            return data?.[0] || null;
        },
        enabled: !!unionId && !!stageId,
        staleTime: 30000,
    });
};
