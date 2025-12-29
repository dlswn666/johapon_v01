'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';

// 소유주 정보 타입
export interface Owner {
    id: string;
    name: string;
    phone: string | null;
    share: string | null;
    is_representative: boolean;
    is_manual: boolean;
    consent_status?: 'AGREED' | 'DISAGREED' | 'PENDING';
    consent_date?: string | null;
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
                .select('pnu, address, area, official_price')
                .eq('pnu', pnu)
                .single();

            if (landError) {
                console.error('필지 조회 오류:', landError);
                // 필지 정보가 없어도 union_land_lots에서 주소 확인 시도
            }

            // 2. 건물 호수 및 소유주 정보 조회
            const { data: buildingUnits, error: unitError } = await supabase
                .from('building_units')
                .select(`
                    id,
                    dong,
                    ho,
                    floor,
                    exclusive_area,
                    owners (
                        id,
                        name,
                        phone,
                        share,
                        is_representative,
                        is_manual
                    )
                `)
                .eq('pnu', pnu);

            if (unitError) {
                console.error('건물 호수 조회 오류:', unitError);
            }

            // 3. 동의 단계 목록 조회 (모든 단계)
            const { data: allStages, error: stagesError } = await supabase
                .from('consent_stages')
                .select('id, stage_name, stage_code, required_rate, sort_order')
                .order('sort_order', { ascending: true });

            if (stagesError) {
                console.error('동의 단계 조회 오류:', stagesError);
            }

            // 4. 소유주 ID 목록 추출
            const ownerIds: string[] = [];
            const units = (buildingUnits || []) as unknown as BuildingUnit[];
            units.forEach(unit => {
                if (unit.owners) {
                    unit.owners.forEach(owner => {
                        ownerIds.push(owner.id);
                    });
                }
            });

            // 5. 소유주별 동의 현황 조회
            let ownerConsents: { owner_id: string; stage_id: string; status: string; consent_date: string | null }[] = [];
            if (ownerIds.length > 0) {
                const { data: consents, error: consentError } = await supabase
                    .from('owner_consents')
                    .select('owner_id, stage_id, status, consent_date')
                    .in('owner_id', ownerIds);

                if (consentError) {
                    console.error('동의 현황 조회 오류:', consentError);
                }
                ownerConsents = consents || [];
            }

            // 6. 소유주에게 현재 선택된 단계의 동의 상태 추가
            const unitsWithConsent = units.map(unit => ({
                ...unit,
                owners: (unit.owners || []).map(owner => {
                    const consent = ownerConsents.find(
                        c => c.owner_id === owner.id && c.stage_id === stageId
                    );
                    return {
                        ...owner,
                        consent_status: (consent?.status as 'AGREED' | 'DISAGREED' | 'PENDING') || 'PENDING',
                        consent_date: consent?.consent_date || null
                    };
                })
            }));

            // 7. 동의 단계별 통계 계산
            const consentStagesStatus: ConsentStageStatus[] = (allStages || []).map(stage => {
                let agreed = 0;
                let disagreed = 0;
                let pending = 0;

                ownerIds.forEach(ownerId => {
                    const consent = ownerConsents.find(
                        c => c.owner_id === ownerId && c.stage_id === stage.id
                    );
                    if (consent?.status === 'AGREED') agreed++;
                    else if (consent?.status === 'DISAGREED') disagreed++;
                    else pending++;
                });

                const total = ownerIds.length;
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

            return {
                pnu,
                address: landLot?.address || pnu,
                land_area: landLot?.area || null,
                official_price: landLot?.official_price || null,
                building_units: unitsWithConsent,
                consent_stages: consentStagesStatus,
                summary: {
                    total_units: units.length,
                    total_owners: ownerIds.length
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

