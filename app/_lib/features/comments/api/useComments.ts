'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { Comment, NewComment, UpdateComment } from '@/app/_lib/shared/type/database.types';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

// ============================================
// Query Hooks (조회)
// ============================================

export const useComments = (entityType: string, entityId: number | string) => {
    const { union } = useSlug();

    return useQuery({
        queryKey: ['comments', union?.id, entityType, entityId],
        queryFn: async () => {
            if (!union?.id) return [];

            const { data, error } = await supabase
                .from('comments')
                .select(`
                    *,
                    author:users(id, name, email)
                `)
                .eq('union_id', union.id)
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('created_at', { ascending: true });

            if (error) {
                throw error;
            }

            return data as (Comment & { author: { id: string; name: string; email: string } })[];
        },
        enabled: !!union?.id && !!entityType && !!entityId,
    });
};

// ============================================
// Mutation Hooks (변경)
// ============================================

export const useAddComment = () => {
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union } = useSlug();

    return useMutation({
        mutationFn: async (newComment: NewComment) => {
            if (!union?.id) throw new Error('Union context missing');

            const { data, error } = await supabase
                .from('comments')
                .insert([{ ...newComment, union_id: union.id }])
                .select(`
                    *,
                    author:users(id, name, email)
                `)
                .single();

            if (error) throw error;

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ 
                queryKey: ['comments', union?.id, data.entity_type, data.entity_id] 
            });
        },
        onError: (error: Error) => {
            console.error('Add comment error:', error);
            openAlertModal({
                title: '댓글 등록 실패',
                message: '댓글 등록에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

export const useUpdateComment = () => {
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union } = useSlug();

    return useMutation({
        mutationFn: async ({ id, content }: { id: number; content: string }) => {
            const { data, error } = await supabase
                .from('comments')
                .update({ content })
                .eq('id', id)
                .select(`
                    *,
                    author:users(id, name, email)
                `)
                .single();

            if (error) throw error;

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ 
                queryKey: ['comments', union?.id, data.entity_type, data.entity_id] 
            });
        },
        onError: (error: Error) => {
            console.error('Update comment error:', error);
            openAlertModal({
                title: '댓글 수정 실패',
                message: '댓글 수정에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

export const useDeleteComment = () => {
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union } = useSlug();

    return useMutation({
        mutationFn: async ({ id, entityType, entityId }: { id: number; entityType: string; entityId: number | string }) => {
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return { id, entityType, entityId };
        },
        onSuccess: ({ entityType, entityId }) => {
            queryClient.invalidateQueries({ 
                queryKey: ['comments', union?.id, entityType, entityId] 
            });
        },
        onError: (error: Error) => {
            console.error('Delete comment error:', error);
            openAlertModal({
                title: '댓글 삭제 실패',
                message: '댓글 삭제에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};
