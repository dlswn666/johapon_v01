'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { HeroSlide } from '@/app/_lib/shared/type/database.types';

/**
 * 특정 조합의 활성 Hero 슬라이드 조회 (최대 5개)
 * - display_order ASC (낮을수록 먼저)
 * - display_order 동일 시 created_at DESC (최신순)
 * - is_active = true인 것만 조회
 * - LIMIT 5
 */
export const useHeroSlides = (unionId: string | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['hero_slides', unionId],
        queryFn: async () => {
            if (!unionId) return [];

            const { data, error } = await supabase
                .from('hero_slides')
                .select('*')
                .eq('union_id', unionId)
                .eq('is_active', true)
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) {
                throw error;
            }

            return data as HeroSlide[];
        },
        enabled: enabled && !!unionId,
    });
};


