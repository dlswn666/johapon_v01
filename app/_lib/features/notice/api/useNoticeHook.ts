'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/shared/supabase/client';
import useNoticeStore from '@/app/_lib/features/notice/model/useNoticeStore';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useFileStore } from '@/app/_lib/shared/stores/file/useFileStore';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import { Notice, NewNotice, UpdateNotice } from '@/app/_lib/shared/type/database.types';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';

// ============================================
// Query Hooks (조회)
// ============================================

/**
 * 전체 공지사항 목록 조회
 */
export const useNotices = (enabled: boolean = true) => {
    const setNotices = useNoticeStore((state) => state.setNotices);
    const { union } = useSlug();

    const queryResult = useQuery({
        queryKey: ['notices', union?.id],
        queryFn: async () => {
            if (!union?.id) return [];

            const { data, error } = await supabase
                .from('notices')
                .select('*')
                .eq('union_id', union.id) // 조합 ID로 필터링
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data as Notice[];
        },
        enabled: enabled && !!union?.id,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setNotices(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, setNotices]);

    return queryResult;
};

/**
 * 특정 공지사항 상세 조회
 */
export const useNotice = (noticeId: number | undefined, enabled: boolean = true) => {
    const setSelectedNotice = useNoticeStore((state) => state.setSelectedNotice);
    const { union } = useSlug();

    const queryResult = useQuery({
        queryKey: ['notices', union?.id, noticeId],
        queryFn: async () => {
            if (!noticeId) throw new Error('Notice ID is required');
            if (!union?.id) throw new Error('Union ID is required');

            const { data, error} = await supabase
                .from('notices')
                .select('*')
                .eq('id', noticeId)
                .eq('union_id', union.id) // 조합 ID로 필터링 (보안 강화)
                .single();

            if (error) {
                throw error;
            }

            return data as Notice;
        },
        enabled: !!noticeId && !!union?.id && enabled,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setSelectedNotice(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, setSelectedNotice]);

    return queryResult;
};

// ============================================
// Mutation Hooks (변경)
// ============================================

/**
 * 공지사항 등록
 */
export const useAddNotice = () => {
    const router = useRouter();
    const addNotice = useNoticeStore((state) => state.addNotice);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { confirmFiles, clearTempFiles } = useFileStore();
    const { union, slug } = useSlug();

    return useMutation({
        mutationFn: async (newNotice: NewNotice) => {
            if (!union?.id) throw new Error('Union context missing');

            // union_id 자동 주입
            const noticeWithUnion = {
                ...newNotice,
                union_id: union.id,
            };

            const { data, error } = await supabase
                .from('notices')
                .insert([noticeWithUnion])
                .select()
                .single();

            if (error) {
                throw error;
            }
            
            // 파일 이관 (임시 -> 영구)
            // noticeId를 targetId로 사용하여 파일 정보 업데이트
            await confirmFiles({
                targetId: String(data.id),
                targetType: 'NOTICE',
                unionSlug: slug,
                uploaderId: newNotice.author_id, // 작성자 ID
            });

            return data as Notice;
        },
        onSuccess: (data) => {
            addNotice(data);
            queryClient.invalidateQueries({ queryKey: ['notices', union?.id] });
            
            // 임시 파일 목록 정리
            clearTempFiles();
            
            openAlertModal({
                title: '등록 완료',
                message: '공지사항이 성공적으로 등록되었습니다.',
                type: 'success',
            });

            // 성공 모달 닫힌 후 목록으로 이동
            setTimeout(() => {
                const path = getUnionPath(slug, '/notice');
                router.push(path);
            }, 1500);
        },
        onError: (error: Error) => {
            console.error('Add notice error:', error);
            openAlertModal({
                title: '등록 실패',
                message: '공지사항 등록에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 공지사항 수정
 */
export const useUpdateNotice = () => {
    const router = useRouter();
    const updateNotice = useNoticeStore((state) => state.updateNotice);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union, slug } = useSlug();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: number; updates: UpdateNotice }) => {
            const { data, error } = await supabase
                .from('notices')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as Notice;
        },
        onSuccess: (data) => {
            updateNotice(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['notices', union?.id] });
            queryClient.invalidateQueries({ queryKey: ['notices', union?.id, data.id] });

            openAlertModal({
                title: '수정 완료',
                message: '공지사항이 성공적으로 수정되었습니다.',
                type: 'success',
            });

            // 성공 모달 닫힌 후 상세 페이지로 이동
            setTimeout(() => {
                const path = getUnionPath(slug, `/notice/${data.id}`);
                router.push(path);
            }, 1500);
        },
        onError: (error: Error) => {
            console.error('Update notice error:', error);
            openAlertModal({
                title: '수정 실패',
                message: '공지사항 수정에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 공지사항 삭제
 */
export const useDeleteNotice = () => {
    const router = useRouter();
    const removeNotice = useNoticeStore((state) => state.removeNotice);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union, slug } = useSlug();

    return useMutation({
        mutationFn: async (noticeId: number) => {
            const { error } = await supabase
                .from('notices')
                .delete()
                .eq('id', noticeId);

            if (error) {
                throw error;
            }

            return noticeId;
        },
        onSuccess: async (noticeId) => {
            removeNotice(noticeId);
            
            // 캐시 무효화를 기다림
            await queryClient.invalidateQueries({ queryKey: ['notices', union?.id] });

            openAlertModal({
                title: '삭제 완료',
                message: '공지사항이 성공적으로 삭제되었습니다.',
                type: 'success',
            });

            // 성공 모달 닫힌 후 목록으로 이동
            setTimeout(() => {
                const path = getUnionPath(slug, '/notice');
                router.push(path);
            }, 1500);
        },
        onError: (error: Error) => {
            console.error('Delete notice error:', error);
            openAlertModal({
                title: '삭제 실패',
                message: '공지사항 삭제에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 조회수 증가
 */
export const useIncrementNoticeViews = () => {
    const incrementViews = useNoticeStore((state) => state.incrementViews);
    const { union } = useSlug();

    return useMutation({
        mutationFn: async (noticeId: number) => {
            const { error } = await supabase.rpc('increment_notice_views', {
                notice_id: noticeId,
            });

            if (error) {
                throw error;
            }

            return noticeId;
        },
        onSuccess: (noticeId) => {
            // 낙관적 업데이트 (Store)
            incrementViews(noticeId);
            
            // 쿼리 캐시 무효화 (목록 페이지에 반영)
            queryClient.invalidateQueries({ queryKey: ['notices', union?.id] });
            queryClient.invalidateQueries({ queryKey: ['notices', union?.id, noticeId] });
        },
        onError: (error: Error) => {
            console.error('Increment views error:', error);
        },
    });
};
