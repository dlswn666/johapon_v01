'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/app/_lib/shared/supabase/client';
import useAlimtalkLogStore from '../model/useAlimtalkLogStore';
import { AlimtalkLogWithUnion } from '@/app/_lib/shared/type/database.types';
import { escapeLikeWildcards } from '@/app/_lib/shared/utils/escapeLike';

// 조합별 알림톡 로그 조회 (조합 관리자용)
export const useAlimtalkLogsByUnion = (unionId: string | undefined, enabled: boolean = true) => {
    const { setLogs, setIsLoading, filters } = useAlimtalkLogStore();

    const queryResult = useQuery({
        queryKey: ['alimtalk-logs', 'union', unionId, filters],
        queryFn: async () => {
            if (!unionId) throw new Error('Union ID is required');

            let query = supabase
                .from('alimtalk_logs')
                .select(`
                    *,
                    union:unions(id, name, slug),
                    sender:users(id, name, email)
                `)
                .eq('union_id', unionId)
                .order('sent_at', { ascending: false });

            // 날짜 필터
            if (filters.dateFrom) {
                query = query.gte('sent_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('sent_at', filters.dateTo);
            }

            // 검색어 필터
            if (filters.searchTerm) {
                const escaped = escapeLikeWildcards(filters.searchTerm);
                query = query.or(`title.ilike.%${escaped}%,template_name.ilike.%${escaped}%`);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return data as AlimtalkLogWithUnion[];
        },
        enabled: !!unionId && enabled,
    });

    useEffect(() => {
        setIsLoading(queryResult.isLoading);
        if (queryResult.data && queryResult.isSuccess) {
            setLogs(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, queryResult.isLoading, setLogs, setIsLoading]);

    return queryResult;
};

// 전체 알림톡 로그 조회 (시스템 관리자용)
export const useAllAlimtalkLogs = (enabled: boolean = true) => {
    const { setLogs, setIsLoading, filters } = useAlimtalkLogStore();

    const queryResult = useQuery({
        queryKey: ['alimtalk-logs', 'all', filters],
        queryFn: async () => {
            let query = supabase
                .from('alimtalk_logs')
                .select(`
                    *,
                    union:unions(id, name, slug),
                    sender:users(id, name, email)
                `)
                .order('sent_at', { ascending: false });

            // 조합 필터
            if (filters.unionId) {
                query = query.eq('union_id', filters.unionId);
            }

            // 채널 필터
            if (filters.channelFilter === 'default') {
                query = query.eq('sender_channel_name', '조합온');
            } else if (filters.channelFilter === 'custom') {
                query = query.neq('sender_channel_name', '조합온');
            }

            // 날짜 필터
            if (filters.dateFrom) {
                query = query.gte('sent_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('sent_at', filters.dateTo);
            }

            // 검색어 필터
            if (filters.searchTerm) {
                const escaped = escapeLikeWildcards(filters.searchTerm);
                query = query.or(`title.ilike.%${escaped}%,template_name.ilike.%${escaped}%`);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return data as AlimtalkLogWithUnion[];
        },
        enabled,
    });

    useEffect(() => {
        setIsLoading(queryResult.isLoading);
        if (queryResult.data && queryResult.isSuccess) {
            setLogs(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, queryResult.isLoading, setLogs, setIsLoading]);

    return queryResult;
};

// 단일 로그 상세 조회
export const useAlimtalkLogDetail = (logId: number | undefined, enabled: boolean = true) => {
    const { setSelectedLog } = useAlimtalkLogStore();

    const queryResult = useQuery({
        queryKey: ['alimtalk-logs', 'detail', logId],
        queryFn: async () => {
            if (!logId) throw new Error('Log ID is required');

            const { data, error } = await supabase
                .from('alimtalk_logs')
                .select(`
                    *,
                    union:unions(id, name, slug),
                    sender:users(id, name, email)
                `)
                .eq('id', logId)
                .single();

            if (error) {
                throw error;
            }

            return data as AlimtalkLogWithUnion;
        },
        enabled: !!logId && enabled,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setSelectedLog(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, setSelectedLog]);

    return queryResult;
};

