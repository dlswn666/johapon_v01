'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';

// 동의 단계 타입 정의
export type BusinessTypeEnum = 'REDEVELOPMENT' | 'RECONSTRUCTION' | 'HOUSING_ASSOCIATION' | 'STREET_HOUSING' | 'SMALL_RECONSTRUCTION';

export interface ConsentStage {
    id: string;
    business_type: BusinessTypeEnum;
    stage_code: string;
    stage_name: string;
    required_rate: number; // 필요 동의율 (%)
    sort_order: number;
    created_at: string;
}

export interface CreateConsentStageInput {
    business_type: BusinessTypeEnum;
    stage_code: string;
    stage_name: string;
    required_rate?: number;
    sort_order?: number;
}

export interface UpdateConsentStageInput {
    business_type?: BusinessTypeEnum;
    stage_code?: string;
    stage_name?: string;
    required_rate?: number;
    sort_order?: number;
}

// 사업 유형 한글 매핑
export const BUSINESS_TYPE_LABELS: Record<BusinessTypeEnum, string> = {
    REDEVELOPMENT: '재개발',
    RECONSTRUCTION: '재건축',
    HOUSING_ASSOCIATION: '지역주택',
    STREET_HOUSING: '가로주택정비',
    SMALL_RECONSTRUCTION: '소규모재건축'
};

// 동의 단계 목록 조회
export const useConsentStages = (businessType?: BusinessTypeEnum) => {
    return useQuery({
        queryKey: ['consent-stages', businessType],
        queryFn: async () => {
            let query = supabase
                .from('consent_stages')
                .select('*')
                .order('sort_order', { ascending: true });

            if (businessType) {
                query = query.eq('business_type', businessType);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as ConsentStage[];
        },
    });
};

// 동의 단계 등록
export const useCreateConsentStage = () => {
    return useMutation({
        mutationFn: async (newStage: CreateConsentStageInput) => {
            const { data, error } = await supabase
                .from('consent_stages')
                .insert([{
                    ...newStage,
                    required_rate: newStage.required_rate ?? 75,
                    sort_order: newStage.sort_order ?? 0
                }])
                .select()
                .single();
            
            if (error) throw error;
            return data as ConsentStage;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consent-stages'] });
        },
    });
};

// 동의 단계 수정
export const useUpdateConsentStage = () => {
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateConsentStageInput }) => {
            const { data, error } = await supabase
                .from('consent_stages')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data as ConsentStage;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consent-stages'] });
        },
    });
};

// 동의 단계 삭제
export const useDeleteConsentStage = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('consent_stages')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consent-stages'] });
        },
    });
};

// ====== 동의 관리 탭 관련 Hook ======

// 동기화 작업 상태 타입
export interface SyncJobStatus {
    id: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress: number;
    preview_data: {
        successCount?: number;
        failCount?: number;
    } | null;
    error_log: string | null;
}

// 작업 상태 조회
export const useSyncJobStatus = (jobId: string | null) => {
    return useQuery({
        queryKey: ['consent-job-status', jobId],
        queryFn: async (): Promise<SyncJobStatus | null> => {
            if (!jobId) return null;

            const { data, error } = await supabase.from('sync_jobs').select('*').eq('id', jobId).single();

            if (error) return null;
            return data as SyncJobStatus;
        },
        enabled: !!jobId,
        refetchInterval: jobId ? 2000 : false,
    });
};

// 조합원 검색 결과 타입
export interface MemberSearchResult {
    id: string;
    name: string;
    property_pnu: string | null;
    property_address: string | null;
    property_dong: string | null;
    property_ho: string | null;
    property_address_jibun: string | null;
    property_address_road: string | null;
    building_name: string | null;
    current_consent_status: 'AGREED' | 'DISAGREED' | 'PENDING';
}

// 조합원 검색 파라미터 타입
export interface SearchMembersParams {
    unionId: string;
    stageId: string;
    searchAddress?: string;
    searchName?: string;
    searchBuilding?: string;
}

// 조합원 검색 (동의 관리용)
export const searchMembersForConsent = async (params: SearchMembersParams): Promise<MemberSearchResult[]> => {
    const { unionId, stageId, searchAddress, searchName, searchBuilding } = params;

    // 주소 검색 시 user_property_units에서 먼저 조회
    let addressUserIds: string[] = [];
    if (searchAddress) {
        const { data: addressUnitsData } = await supabase
            .from('user_property_units')
            .select('user_id')
            .ilike('property_address_jibun', `%${searchAddress}%`);

        if (addressUnitsData && addressUnitsData.length > 0) {
            addressUserIds = [...new Set(addressUnitsData.map((u) => u.user_id))];
        }
    }

    // 건물이름 검색 시 buildings 테이블에서 먼저 조회
    let buildingUserIds: string[] = [];
    if (searchBuilding) {
        const { data: buildingsData } = await supabase
            .from('buildings')
            .select('id')
            .ilike('building_name', `%${searchBuilding}%`);

        if (buildingsData && buildingsData.length > 0) {
            const buildingIds = buildingsData.map((b) => b.id);

            const { data: buildingUnitsData } = await supabase
                .from('building_units')
                .select('id')
                .in('building_id', buildingIds);

            if (buildingUnitsData && buildingUnitsData.length > 0) {
                const unitIds = buildingUnitsData.map((u) => u.id);

                const { data: userPropertyUnitsData } = await supabase
                    .from('user_property_units')
                    .select('user_id')
                    .in('building_unit_id', unitIds);

                if (userPropertyUnitsData) {
                    buildingUserIds = [...new Set(userPropertyUnitsData.map((u) => u.user_id))];
                }
            }
        }

        // 건물이름으로 검색했지만 결과가 없는 경우
        if (buildingUserIds.length === 0) {
            return [];
        }
    }

    // 기본 쿼리 설정
    let query = supabase
        .from('users')
        .select(
            `
            id, name, property_address,
            user_property_units!left(pnu, property_address_jibun, property_address_road, dong, ho, building_name)
        `
        )
        .eq('union_id', unionId)
        .in('user_status', ['APPROVED', 'PRE_REGISTERED'])
        .order('name', { ascending: true });

    // 건물이름 검색: 조회된 user_id 목록으로 필터링
    if (searchBuilding && buildingUserIds.length > 0) {
        query = query.in('id', buildingUserIds);
    }

    // 이름 검색: 직접 ilike 적용
    if (searchName) {
        query = query.ilike('name', `%${searchName}%`);
    }

    // 주소 검색 조건
    if (searchAddress) {
        if (addressUserIds.length > 0) {
            query = query.or(`id.in.(${addressUserIds.join(',')}),property_address.ilike.%${searchAddress}%`);
        } else {
            query = query.ilike('property_address', `%${searchAddress}%`);
        }
    }

    const { data: members, error } = await query.limit(100);

    if (error) throw error;

    if (!members || members.length === 0) {
        return [];
    }

    // 각 조합원의 현재 동의 상태 조회
    const memberIds = members.map((m) => m.id);
    const { data: consents } = await supabase
        .from('user_consents')
        .select('user_id, status')
        .in('user_id', memberIds)
        .eq('stage_id', stageId);

    // Map으로 동의 현황 사전 인덱싱 (성능 최적화: O(n*m) -> O(n+m))
    const consentMap = new Map(
        (consents || []).map((c) => [c.user_id, c])
    );

    // 결과 매핑
    type PropertyUnit = {
        pnu: string | null;
        property_address_jibun: string | null;
        property_address_road: string | null;
        dong: string | null;
        ho: string | null;
        building_name: string | null;
    };

    return members.map((member) => {
        const consent = consentMap.get(member.id);  // O(1) 조회
        const propUnit = (member.user_property_units as PropertyUnit[] | null)?.[0] || null;
        return {
            id: member.id,
            name: member.name,
            property_address: member.property_address,
            property_pnu: propUnit?.pnu || null,
            property_dong: propUnit?.dong || null,
            property_ho: propUnit?.ho || null,
            property_address_jibun: propUnit?.property_address_jibun || null,
            property_address_road: propUnit?.property_address_road || null,
            building_name: propUnit?.building_name || null,
            current_consent_status: (consent?.status as 'AGREED' | 'DISAGREED' | 'PENDING') || 'PENDING',
        };
    });
};

