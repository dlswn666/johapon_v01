'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import useAlimtalkTemplateStore from '../model/useAlimtalkTemplateStore';
import { syncAlimtalkTemplates } from '../actions/sendAlimTalk';
import { AlimtalkTemplate } from '@/app/_lib/shared/type/database.types';

// 템플릿 목록 조회
export const useAlimtalkTemplates = (enabled: boolean = true) => {
    const { setTemplates, setIsLoading } = useAlimtalkTemplateStore();

    const queryResult = useQuery({
        queryKey: ['alimtalk-templates'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('alimtalk_templates')
                .select('*')
                .order('template_code', { ascending: true });

            if (error) {
                throw error;
            }

            return data as AlimtalkTemplate[];
        },
        enabled,
    });

    useEffect(() => {
        setIsLoading(queryResult.isLoading);
        if (queryResult.data && queryResult.isSuccess) {
            setTemplates(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, queryResult.isLoading, setTemplates, setIsLoading]);

    return queryResult;
};

// 단일 템플릿 조회
export const useAlimtalkTemplate = (templateCode: string | undefined, enabled: boolean = true) => {
    const { setSelectedTemplate } = useAlimtalkTemplateStore();

    const queryResult = useQuery({
        queryKey: ['alimtalk-templates', templateCode],
        queryFn: async () => {
            if (!templateCode) throw new Error('Template code is required');

            const { data, error } = await supabase
                .from('alimtalk_templates')
                .select('*')
                .eq('template_code', templateCode)
                .single();

            if (error) {
                throw error;
            }

            return data as AlimtalkTemplate;
        },
        enabled: !!templateCode && enabled,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setSelectedTemplate(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, setSelectedTemplate]);

    return queryResult;
};

// 알리고 템플릿 동기화
export const useSyncAlimtalkTemplates = () => {
    const { setIsSyncing, setLastSyncedAt } = useAlimtalkTemplateStore();

    return useMutation({
        mutationFn: async () => {
            setIsSyncing(true);
            const result = await syncAlimtalkTemplates();
            
            if (!result.success) {
                throw new Error(result.error || '동기화 실패');
            }
            
            return result;
        },
        onSuccess: (result) => {
            setIsSyncing(false);
            if (result.data?.syncedAt) {
                setLastSyncedAt(result.data.syncedAt);
            }
            queryClient.invalidateQueries({ queryKey: ['alimtalk-templates'] });
            
            const { inserted, updated, deleted } = result.data || {};
            toast.success(
                `템플릿 동기화 완료: 추가 ${inserted || 0}건, 수정 ${updated || 0}건, 삭제 ${deleted || 0}건`
            );
        },
        onError: (error: Error) => {
            setIsSyncing(false);
            toast.error(error.message || '템플릿 동기화에 실패했습니다.');
            console.error('Template sync error:', error);
        },
    });
};

