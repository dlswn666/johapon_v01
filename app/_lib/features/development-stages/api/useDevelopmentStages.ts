'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';

export interface DevelopmentStage {
    id: string;
    business_type: string;
    stage_name: string;
    sort_order: number;
    created_at: string;
}

// 모든 단계 조회
export const useDevelopmentStages = (businessType?: string) => {
    return useQuery({
        queryKey: ['development-stages', businessType],
        queryFn: async () => {
            let query = supabase.from('development_stages').select('*').order('sort_order', { ascending: true });

            if (businessType) {
                query = query.eq('business_type', businessType);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as DevelopmentStage[];
        },
    });
};

// 단계 등록
export const useCreateDevelopmentStage = () => {
    return useMutation({
        mutationFn: async (newStage: Omit<DevelopmentStage, 'id' | 'created_at'>) => {
            const { data, error } = await supabase.from('development_stages').insert([newStage]).select().single();
            if (error) throw error;
            return data as DevelopmentStage;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['development-stages'] });
        },
    });
};

// 단계 수정
export const useUpdateDevelopmentStage = () => {
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<DevelopmentStage> }) => {
            const { data, error } = await supabase.from('development_stages').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data as DevelopmentStage;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['development-stages'] });
        },
    });
};

// 단계 삭제
export const useDeleteDevelopmentStage = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('development_stages').delete().eq('id', id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['development-stages'] });
        },
    });
};
