'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import useAlimtalkPricingStore from '../model/useAlimtalkPricingStore';
import { AlimtalkPricing, NewAlimtalkPricing } from '@/app/_lib/shared/type/database.types';

// 단가 목록 조회
export const useAlimtalkPricing = (enabled: boolean = true) => {
    const { setPricingList, setIsLoading } = useAlimtalkPricingStore();

    const queryResult = useQuery({
        queryKey: ['alimtalk-pricing'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('alimtalk_pricing')
                .select('*')
                .order('message_type', { ascending: true })
                .order('effective_from', { ascending: false });

            if (error) {
                throw error;
            }

            return data as AlimtalkPricing[];
        },
        enabled,
    });

    useEffect(() => {
        setIsLoading(queryResult.isLoading);
        if (queryResult.data && queryResult.isSuccess) {
            setPricingList(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, queryResult.isLoading, setPricingList, setIsLoading]);

    return queryResult;
};

// 현재 적용 중인 단가 조회 (RPC 사용)
export const useCurrentPricing = (enabled: boolean = true) => {
    const { setCurrentPricing } = useAlimtalkPricingStore();

    const queryResult = useQuery({
        queryKey: ['alimtalk-pricing', 'current'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_current_pricing');

            if (error) {
                throw error;
            }

            return data as { message_type: string; unit_price: number }[];
        },
        enabled,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            const pricingMap = new Map<string, number>();
            for (const item of queryResult.data) {
                pricingMap.set(item.message_type, item.unit_price);
            }
            // 기본값 설정
            if (!pricingMap.has('KAKAO')) pricingMap.set('KAKAO', 15);
            if (!pricingMap.has('SMS')) pricingMap.set('SMS', 20);
            if (!pricingMap.has('LMS')) pricingMap.set('LMS', 50);
            
            setCurrentPricing(pricingMap);
        }
    }, [queryResult.data, queryResult.isSuccess, setCurrentPricing]);

    return queryResult;
};

// 단가 추가 (새 단가 등록)
export const useAddAlimtalkPricing = () => {
    const { addPricing } = useAlimtalkPricingStore();

    return useMutation({
        mutationFn: async (newPricing: NewAlimtalkPricing) => {
            const { data, error } = await supabase
                .from('alimtalk_pricing')
                .insert([newPricing])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as AlimtalkPricing;
        },
        onSuccess: (data) => {
            addPricing(data);
            queryClient.invalidateQueries({ queryKey: ['alimtalk-pricing'] });
            toast.success('단가가 등록되었습니다.');
        },
        onError: (error: Error) => {
            toast.error('단가 등록에 실패했습니다.');
            console.error('Add pricing error:', error);
        },
    });
};

// 메시지 타입별 단가 업데이트 (새 단가 추가 방식)
export const useUpdateAlimtalkPricing = () => {
    const { addPricing } = useAlimtalkPricingStore();

    return useMutation({
        mutationFn: async ({
            messageType,
            unitPrice,
            effectiveFrom,
        }: {
            messageType: string;
            unitPrice: number;
            effectiveFrom: string;
        }) => {
            const { data, error } = await supabase
                .from('alimtalk_pricing')
                .insert([
                    {
                        message_type: messageType,
                        unit_price: unitPrice,
                        effective_from: effectiveFrom,
                    },
                ])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as AlimtalkPricing;
        },
        onSuccess: (data) => {
            addPricing(data);
            queryClient.invalidateQueries({ queryKey: ['alimtalk-pricing'] });
            toast.success('단가가 수정되었습니다.');
        },
        onError: (error: Error) => {
            toast.error('단가 수정에 실패했습니다.');
            console.error('Update pricing error:', error);
        },
    });
};

