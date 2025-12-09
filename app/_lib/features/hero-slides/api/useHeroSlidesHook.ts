'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import useHeroSlidesStore from '@/app/_lib/features/hero-slides/model/useHeroSlidesStore';
import { HeroSlide, NewHeroSlide, UpdateHeroSlide } from '@/app/_lib/shared/type/database.types';

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

/**
 * 관리자용 전체 슬라이드 조회 (is_active 무관)
 * - 현재 조합의 모든 슬라이드 조회
 * - display_order ASC, created_at DESC 정렬
 */
export const useAllHeroSlides = (unionId: string | undefined, enabled: boolean = true) => {
    const setSlides = useHeroSlidesStore((state) => state.setSlides);

    const queryResult = useQuery({
        queryKey: ['hero_slides', 'all', unionId],
        queryFn: async () => {
            if (!unionId) return [];

            const { data, error } = await supabase
                .from('hero_slides')
                .select('*')
                .eq('union_id', unionId)
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data as HeroSlide[];
        },
        enabled: enabled && !!unionId,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setSlides(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, setSlides]);

    return queryResult;
};

/**
 * 단일 슬라이드 조회
 */
export const useHeroSlide = (slideId: string | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['hero_slides', 'detail', slideId],
        queryFn: async () => {
            if (!slideId) throw new Error('Slide ID is required');

            const { data, error } = await supabase
                .from('hero_slides')
                .select('*')
                .eq('id', slideId)
                .single();

            if (error) {
                throw error;
            }

            return data as HeroSlide;
        },
        enabled: enabled && !!slideId,
    });
};

/**
 * 슬라이드 생성 Mutation
 */
export const useCreateHeroSlide = () => {
    const addSlide = useHeroSlidesStore((state) => state.addSlide);

    return useMutation({
        mutationFn: async (newSlide: NewHeroSlide) => {
            const { data, error } = await supabase
                .from('hero_slides')
                .insert([newSlide])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as HeroSlide;
        },
        onSuccess: (data) => {
            addSlide(data);
            queryClient.invalidateQueries({ queryKey: ['hero_slides'] });
            toast.success('슬라이드가 등록되었습니다.');
        },
        onError: (error: Error) => {
            toast.error('슬라이드 등록에 실패했습니다.');
            console.error('Create hero slide error:', error);
        },
    });
};

/**
 * 슬라이드 수정 Mutation
 */
export const useUpdateHeroSlide = () => {
    const updateSlide = useHeroSlidesStore((state) => state.updateSlide);

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateHeroSlide }) => {
            const { data, error } = await supabase
                .from('hero_slides')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as HeroSlide;
        },
        onSuccess: (data) => {
            updateSlide(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['hero_slides'] });
            toast.success('슬라이드가 수정되었습니다.');
        },
        onError: (error: Error) => {
            toast.error('슬라이드 수정에 실패했습니다.');
            console.error('Update hero slide error:', error);
        },
    });
};

/**
 * 슬라이드 삭제 Mutation
 */
export const useDeleteHeroSlide = () => {
    const removeSlide = useHeroSlidesStore((state) => state.removeSlide);

    return useMutation({
        mutationFn: async (slideId: string) => {
            const { error } = await supabase
                .from('hero_slides')
                .delete()
                .eq('id', slideId);

            if (error) {
                throw error;
            }

            return slideId;
        },
        onSuccess: (slideId) => {
            removeSlide(slideId);
            queryClient.invalidateQueries({ queryKey: ['hero_slides'] });
            toast.success('슬라이드가 삭제되었습니다.');
        },
        onError: (error: Error) => {
            toast.error('슬라이드 삭제에 실패했습니다.');
            console.error('Delete hero slide error:', error);
        },
    });
};
