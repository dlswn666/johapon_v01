'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { Union } from '@/app/_lib/shared/type/database.types';

// 전체 조합 목록 조회 (필터 없이 단순 조회)
export const useUnions = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['unions', 'all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('unions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data as Union[];
        },
        enabled,
    });
};

// 단일 조합 조회
export const useUnion = (unionId: string | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['unions', unionId],
        queryFn: async () => {
            if (!unionId) throw new Error('Union ID is required');

            const { data, error } = await supabase.from('unions').select('*').eq('id', unionId).single();

            if (error) {
                throw error;
            }

            return data as Union;
        },
        enabled: !!unionId && enabled,
    });
};

// slug로 조합 조회
export const useUnionBySlug = (slug: string | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['unions', 'slug', slug],
        queryFn: async () => {
            if (!slug) throw new Error('Slug is required');

            const { data, error } = await supabase.from('unions').select('*').eq('slug', slug).single();

            if (error) {
                throw error;
            }

            return data as Union;
        },
        enabled: !!slug && enabled,
    });
};

