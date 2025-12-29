'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';

// 동의 단계 타입 정의
export type BusinessTypeEnum = 'REDEVELOPMENT' | 'RECONSTRUCTION' | 'HOUSING_ASSOCIATION';

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
    HOUSING_ASSOCIATION: '지역주택조합'
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

