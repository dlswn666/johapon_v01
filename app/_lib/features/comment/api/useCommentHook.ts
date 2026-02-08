'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/app/_lib/shared/supabase/client';
import useCommentStore from '@/app/_lib/features/comment/model/useCommentStore';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import { Comment, NewComment, UpdateComment, User } from '@/app/_lib/shared/type/database.types';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

// ============================================
// 타입 정의
// ============================================

export type EntityType = 'notice' | 'board' | string;

export interface CommentWithAuthor extends Comment {
    author: Pick<User, 'id' | 'name'> | null;
    replies?: CommentWithAuthor[];
}

// ============================================
// Query Hooks (조회)
// ============================================

/**
 * 특정 엔티티의 댓글 목록 조회
 * @param entityType - 엔티티 타입 (예: 'notice', 'board')
 * @param entityId - 엔티티 ID
 * @param enabled - 쿼리 활성화 여부
 */
export const useComments = (
    entityType: EntityType,
    entityId: number | undefined,
    enabled: boolean = true
) => {
    const setComments = useCommentStore((state) => state.setComments);
    const { union } = useSlug();

    const queryResult = useQuery({
        queryKey: ['comments', entityType, entityId, union?.id],
        queryFn: async () => {
            if (!entityId) throw new Error('Entity ID is required');

            // 댓글과 작성자 정보 조회 (parent_id가 null인 것 = 원댓글)
            const { data, error } = await supabase
                .from('comments')
                .select(`
                    *,
                    author:users!comments_author_id_fkey(id, name)
                `)
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('created_at', { ascending: true });

            if (error) {
                throw error;
            }

            // 댓글과 답글을 계층 구조로 정리
            const comments = data as CommentWithAuthor[];
            const parentComments = comments.filter((c) => c.parent_id === null);
            const replies = comments.filter((c) => c.parent_id !== null);

            // 원댓글에 답글 연결
            const commentsWithReplies = parentComments.map((parent) => ({
                ...parent,
                replies: replies.filter((r) => r.parent_id === parent.id),
            }));

            return commentsWithReplies;
        },
        enabled: enabled && !!entityId,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            // Store에는 flat 구조로 저장 (필요시)
            const flatComments = queryResult.data.flatMap((c) => [
                c,
                ...(c.replies || []),
            ]);
            setComments(flatComments as Comment[]);
        }
    }, [queryResult.data, queryResult.isSuccess, setComments]);

    return queryResult;
};

/**
 * 특정 엔티티의 댓글 개수 조회
 */
export const useCommentCount = (
    entityType: EntityType,
    entityId: number | undefined,
    enabled: boolean = true
) => {
    return useQuery({
        queryKey: ['comments', 'count', entityType, entityId],
        queryFn: async () => {
            if (!entityId) return 0;

            const { count, error } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('entity_type', entityType)
                .eq('entity_id', entityId);

            if (error) {
                throw error;
            }

            return count || 0;
        },
        enabled: enabled && !!entityId,
    });
};

// ============================================
// Mutation Hooks (변경)
// ============================================

/**
 * 댓글/답글 등록
 */
export const useAddComment = () => {
    const addComment = useCommentStore((state) => state.addComment);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union } = useSlug();

    return useMutation({
        mutationFn: async (newComment: NewComment) => {
            // 답글인 경우 1단계만 허용 (대댓글의 대댓글 방지)
            if (newComment.parent_id) {
                const { data: parentComment, error: parentError } = await supabase
                    .from('comments')
                    .select('parent_id')
                    .eq('id', newComment.parent_id)
                    .single();

                if (parentError) {
                    throw new Error('부모 댓글을 찾을 수 없습니다.');
                }

                // 부모 댓글이 이미 답글인 경우 (parent_id가 있는 경우) 에러
                if (parentComment.parent_id !== null) {
                    throw new Error('답글에는 답글을 달 수 없습니다.');
                }
            }

            const commentData: NewComment = {
                ...newComment,
                union_id: newComment.union_id || union?.id,
            };

            const { data, error } = await supabase
                .from('comments')
                .insert([commentData])
                .select(`
                    *,
                    author:users!comments_author_id_fkey(id, name)
                `)
                .single();

            if (error) {
                throw error;
            }

            return data as CommentWithAuthor;
        },
        onSuccess: (data) => {
            addComment(data);
            // 캐시 무효화
            queryClient.invalidateQueries({
                queryKey: ['comments', data.entity_type, data.entity_id],
            });
            queryClient.invalidateQueries({
                queryKey: ['comments', 'count', data.entity_type, data.entity_id],
            });
        },
        onError: (error: Error) => {
            console.error('Add comment error:', error);
            openAlertModal({
                title: '댓글 등록 실패',
                message: error.message || '댓글 등록에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 댓글 수정
 */
export const useUpdateComment = () => {
    const updateComment = useCommentStore((state) => state.updateComment);
    const openAlertModal = useModalStore((state) => state.openAlertModal);

    return useMutation({
        mutationFn: async ({
            id,
            updates,
            entityType,
            entityId,
            userId,
            isAdmin,
        }: {
            id: number;
            updates: UpdateComment;
            entityType: EntityType;
            entityId: number;
            userId?: string;
            isAdmin?: boolean;
        }) => {
            let query = supabase
                .from('comments')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (!isAdmin && userId) {
                query = query.eq('author_id', userId);
            }

            const { data, error } = await query
                .select(`
                    *,
                    author:users!comments_author_id_fkey(id, name)
                `)
                .single();

            if (error) {
                throw error;
            }

            return { comment: data as CommentWithAuthor, entityType, entityId };
        },
        onSuccess: ({ comment, entityType, entityId }) => {
            updateComment(comment.id, comment);
            // 캐시 무효화
            queryClient.invalidateQueries({
                queryKey: ['comments', entityType, entityId],
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

/**
 * 댓글 삭제
 */
export const useDeleteComment = () => {
    const removeComment = useCommentStore((state) => state.removeComment);
    const openAlertModal = useModalStore((state) => state.openAlertModal);

    return useMutation({
        mutationFn: async ({
            id,
            entityType,
            entityId,
            userId,
            isAdmin,
        }: {
            id: number;
            entityType: EntityType;
            entityId: number;
            userId?: string;
            isAdmin?: boolean;
        }) => {
            // CASCADE로 답글도 함께 삭제됨
            let query = supabase
                .from('comments')
                .delete()
                .eq('id', id);

            // Non-admin users can only delete their own comments
            if (!isAdmin && userId) {
                query = query.eq('author_id', userId);
            }

            const { error } = await query;

            if (error) {
                throw error;
            }

            return { id, entityType, entityId };
        },
        onSuccess: ({ id, entityType, entityId }) => {
            removeComment(id);
            // 캐시 무효화
            queryClient.invalidateQueries({
                queryKey: ['comments', entityType, entityId],
            });
            queryClient.invalidateQueries({
                queryKey: ['comments', 'count', entityType, entityId],
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

