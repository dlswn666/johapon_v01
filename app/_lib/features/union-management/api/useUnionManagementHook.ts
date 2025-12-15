'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useUnionManagementStore, UnionWithActive } from '../model/useUnionManagementStore';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import { NewUnion, UpdateUnion } from '@/app/_lib/shared/type/database.types';

// 조합 목록 조회
export const useUnions = (enabled: boolean = true) => {
    const setUnions = useUnionManagementStore((state) => state.setUnions);
    const searchKeyword = useUnionManagementStore((state) => state.searchKeyword);
    const filterStatus = useUnionManagementStore((state) => state.filterStatus);

    const queryResult = useQuery({
        queryKey: ['unions', 'management', searchKeyword, filterStatus],
        queryFn: async () => {
            let query = supabase.from('unions').select('*').order('created_at', { ascending: false });

            // 검색어 필터
            if (searchKeyword) {
                query = query.ilike('name', `%${searchKeyword}%`);
            }

            // 활성화 상태 필터
            if (filterStatus === 'active') {
                query = query.eq('is_active', true);
            } else if (filterStatus === 'inactive') {
                query = query.eq('is_active', false);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return data as UnionWithActive[];
        },
        enabled,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setUnions(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, setUnions]);

    return queryResult;
};

// 전체 조합 통계 조회 (필터 없이)
export const useUnionStats = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['unions', 'stats'],
        queryFn: async () => {
            const { data, error } = await supabase.from('unions').select('id, is_active');

            if (error) {
                throw error;
            }

            const total = data?.length || 0;
            const active = data?.filter((u) => u.is_active).length || 0;
            const inactive = data?.filter((u) => !u.is_active).length || 0;

            return { total, active, inactive };
        },
        enabled,
    });
};

// 단일 조합 조회
export const useUnion = (unionId: string | undefined, enabled: boolean = true) => {
    const setSelectedUnion = useUnionManagementStore((state) => state.setSelectedUnion);

    const queryResult = useQuery({
        queryKey: ['unions', unionId],
        queryFn: async () => {
            if (!unionId) throw new Error('Union ID is required');

            const { data, error } = await supabase.from('unions').select('*').eq('id', unionId).single();

            if (error) {
                throw error;
            }

            return data as UnionWithActive;
        },
        enabled: !!unionId && enabled,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setSelectedUnion(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, setSelectedUnion]);

    return queryResult;
};

// 조합 생성 타입 확장
interface CreateUnionInput extends NewUnion {
    is_active?: boolean;
}

// 조합 생성
export const useCreateUnion = () => {
    const addUnion = useUnionManagementStore((state) => state.addUnion);

    return useMutation({
        mutationFn: async (newUnion: CreateUnionInput) => {
            const { data, error } = await supabase
                .from('unions')
                .insert([{ ...newUnion, is_active: newUnion.is_active ?? true }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as UnionWithActive;
        },
        onSuccess: (data) => {
            addUnion(data);
            queryClient.invalidateQueries({ queryKey: ['unions'] });
        },
    });
};

// 조합 수정 타입 확장
interface UpdateUnionInput extends UpdateUnion {
    is_active?: boolean;
}

// 조합 수정
export const useUpdateUnion = () => {
    const updateUnion = useUnionManagementStore((state) => state.updateUnion);

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateUnionInput }) => {
            const { data, error } = await supabase
                .from('unions')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as UnionWithActive;
        },
        onSuccess: (data) => {
            updateUnion(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['unions'] });
            queryClient.invalidateQueries({ queryKey: ['unions', data.id] });
        },
    });
};

// 조합 삭제 (관련 데이터 포함)
export const useDeleteUnion = () => {
    const removeUnion = useUnionManagementStore((state) => state.removeUnion);

    return useMutation({
        mutationFn: async (unionId: string) => {
            // 1. 조합 정보 조회 (slug 확인용)
            const { data: union, error: unionError } = await supabase
                .from('unions')
                .select('slug')
                .eq('id', unionId)
                .single();

            if (unionError) {
                throw unionError;
            }

            // 2. 관련 hero_slides 삭제
            const { error: heroError } = await supabase.from('hero_slides').delete().eq('union_id', unionId);

            if (heroError) {
                console.error('Hero slides delete error:', heroError);
            }

            // 3. 관련 comments 삭제
            const { error: commentsError } = await supabase.from('comments').delete().eq('union_id', unionId);

            if (commentsError) {
                console.error('Comments delete error:', commentsError);
            }

            // 4. 관련 notices의 files 조회 및 삭제
            const { data: notices } = await supabase.from('notices').select('id').eq('union_id', unionId);

            if (notices && notices.length > 0) {
                const noticeIds = notices.map((n) => n.id);

                // files 삭제
                const { error: filesError } = await supabase.from('files').delete().in('notice_id', noticeIds);

                if (filesError) {
                    console.error('Files delete error:', filesError);
                }
            }

            // 5. union_id로 연결된 files 삭제
            const { error: unionFilesError } = await supabase.from('files').delete().eq('union_id', unionId);

            if (unionFilesError) {
                console.error('Union files delete error:', unionFilesError);
            }

            // 6. 관련 notices 삭제
            const { error: noticesError } = await supabase.from('notices').delete().eq('union_id', unionId);

            if (noticesError) {
                console.error('Notices delete error:', noticesError);
            }

            // 7. Storage에서 조합 관련 파일 삭제
            if (union?.slug) {
                const { data: storageFiles } = await supabase.storage.from('files').list(union.slug);

                if (storageFiles && storageFiles.length > 0) {
                    const filePaths = storageFiles.map((f) => `${union.slug}/${f.name}`);
                    await supabase.storage.from('files').remove(filePaths);
                }
            }

            // 8. 조합 삭제
            const { error } = await supabase.from('unions').delete().eq('id', unionId);

            if (error) {
                throw error;
            }

            return unionId;
        },
        onSuccess: (unionId) => {
            removeUnion(unionId);
            queryClient.invalidateQueries({ queryKey: ['unions'] });
        },
    });
};

// 조합 활성화/비활성화 토글
export const useToggleUnionActive = () => {
    const updateUnion = useUnionManagementStore((state) => state.updateUnion);

    return useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { data, error } = await supabase
                .from('unions')
                .update({ is_active: isActive, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as UnionWithActive;
        },
        onSuccess: (data) => {
            updateUnion(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['unions'] });
            queryClient.invalidateQueries({ queryKey: ['unions', data.id] });
        },
    });
};

// 조합 알림톡 설정 업데이트 (kakao_channel_id만)
export const useUpdateUnionAlimtalkSettings = () => {
    const updateUnion = useUnionManagementStore((state) => state.updateUnion);

    return useMutation({
        mutationFn: async ({
            id,
            kakaoChannelId,
        }: {
            id: string;
            kakaoChannelId: string | null;
        }) => {
            const { data, error } = await supabase
                .from('unions')
                .update({
                    kakao_channel_id: kakaoChannelId,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as UnionWithActive;
        },
        onSuccess: (data) => {
            updateUnion(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['unions'] });
            queryClient.invalidateQueries({ queryKey: ['unions', data.id] });
        },
    });
};

// 조합 Sender Key 등록 (Vault에 저장)
export const useRegisterUnionSenderKey = () => {
    const updateUnion = useUnionManagementStore((state) => state.updateUnion);

    return useMutation({
        mutationFn: async ({
            unionId,
            senderKey,
            channelName,
        }: {
            unionId: string;
            senderKey: string;
            channelName: string;
        }) => {
            // RPC 호출로 Vault에 Sender Key 저장
            const { data: secretId, error: rpcError } = await supabase.rpc('register_union_sender_key', {
                p_union_id: unionId,
                p_sender_key: senderKey,
                p_channel_name: channelName,
            });

            if (rpcError) {
                throw rpcError;
            }

            // 업데이트된 조합 정보 조회
            const { data: unionData, error: unionError } = await supabase
                .from('unions')
                .select('*')
                .eq('id', unionId)
                .single();

            if (unionError) {
                throw unionError;
            }

            return unionData as UnionWithActive;
        },
        onSuccess: (data) => {
            updateUnion(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['unions'] });
            queryClient.invalidateQueries({ queryKey: ['unions', data.id] });
        },
    });
};