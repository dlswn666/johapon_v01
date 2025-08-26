import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
    CommentItem,
    CommentDetail,
    CommentCreateData,
    CommentUpdateData,
    DbCommentWithAuthor,
} from '@/entities/comment/model/types';

interface CommentState {
    // 상태
    comments: CommentItem[];
    loading: boolean;
    error: string | null;
    total: number;

    // 액션
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setComments: (comments: CommentItem[]) => void;
    addComment: (comment: CommentItem) => void;
    updateComment: (id: string, updates: Partial<CommentItem>) => void;
    removeComment: (id: string) => void;
    setTotal: (total: number) => void;
    resetState: () => void;

    // API 호출 액션
    fetchComments: (slug: string, targetTable: string, targetId: string) => Promise<void>;
    createComment: (
        slug: string,
        data: CommentCreateData
    ) => Promise<{ success: boolean; id?: string; message: string }>;
    updateCommentContent: (
        slug: string,
        id: string,
        data: CommentUpdateData
    ) => Promise<{ success: boolean; message: string }>;
    deleteComment: (slug: string, id: string) => Promise<{ success: boolean; message: string }>;
}

// 데이터 변환 함수
function transformDbCommentToItem(comment: DbCommentWithAuthor): CommentItem {
    return {
        id: comment.id,
        content: comment.content,
        author: comment.is_anonymous ? '익명' : comment.author_name || comment.created_by || '작성자',
        date: new Date(comment.created_at).toISOString().split('T')[0],
        isAnonymous: comment.is_anonymous || false,
        parentId: comment.parent_id || undefined,
        created_by: comment.created_by || undefined,
        replies: [], // 대댓글은 별도로 처리
    };
}

// 댓글을 트리 구조로 변환
function organizeCommentsAsTree(comments: CommentItem[]): CommentItem[] {
    const commentMap = new Map<string, CommentItem>();
    const rootComments: CommentItem[] = [];

    // 모든 댓글을 Map에 저장
    comments.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // 부모-자식 관계 설정
    comments.forEach((comment) => {
        const commentItem = commentMap.get(comment.id);
        if (!commentItem) return;

        if (comment.parentId) {
            const parent = commentMap.get(comment.parentId);
            if (parent) {
                parent.replies = parent.replies || [];
                parent.replies.push(commentItem);
            }
        } else {
            rootComments.push(commentItem);
        }
    });

    return rootComments;
}

export const useCommentStore = create<CommentState>()(
    devtools(
        (set, get) => ({
            // 초기 상태
            comments: [],
            loading: false,
            error: null,
            total: 0,

            // 기본 액션
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),
            setComments: (comments) => set({ comments }),
            addComment: (comment) =>
                set((state) => ({
                    comments: [comment, ...state.comments],
                    total: state.total + 1,
                })),
            updateComment: (id, updates) =>
                set((state) => ({
                    comments: state.comments.map((comment) =>
                        comment.id === id ? { ...comment, ...updates } : comment
                    ),
                })),
            removeComment: (id) =>
                set((state) => ({
                    comments: state.comments.filter((comment) => comment.id !== id),
                    total: Math.max(0, state.total - 1),
                })),
            setTotal: (total) => set({ total }),
            resetState: () =>
                set({
                    comments: [],
                    loading: false,
                    error: null,
                    total: 0,
                }),

            // API 호출 액션
            fetchComments: async (slug: string, targetTable: string, targetId: string) => {
                set({ loading: true, error: null });

                try {
                    const queryParams = new URLSearchParams({
                        target_table: targetTable,
                        target_id: targetId,
                    });

                    const response = await fetch(`/api/tenant/${slug}/comments?${queryParams}`);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message || errorData.message || `API 호출 실패 (${response.status})`
                        );
                    }

                    const responseData = await response.json();

                    if (!responseData.success) {
                        throw new Error(responseData.error?.message || 'API 호출이 실패했습니다.');
                    }

                    const data = responseData.data;
                    if (!data || !Array.isArray(data.items)) {
                        throw new Error('API 응답 데이터 형식이 올바르지 않습니다.');
                    }

                    const transformedComments = data.items.map(transformDbCommentToItem);
                    const organizedComments = organizeCommentsAsTree(transformedComments);

                    set({
                        comments: organizedComments,
                        total: data.total,
                        loading: false,
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            createComment: async (slug: string, data: CommentCreateData) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/comments`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: 'Bearer temp-token', // 임시 토큰
                        },
                        body: JSON.stringify(data),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message || errorData.message || `등록에 실패했습니다. (${response.status})`
                        );
                    }

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.error?.message || '댓글 등록에 실패했습니다.');
                    }

                    set({ loading: false });

                    return {
                        success: true,
                        id: result.data.id,
                        message: '댓글이 성공적으로 등록되었습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '댓글 등록에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            updateCommentContent: async (slug: string, id: string, data: CommentUpdateData) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/comments/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: 'Bearer temp-token', // 임시 토큰
                        },
                        body: JSON.stringify(data),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message || errorData.message || `수정에 실패했습니다. (${response.status})`
                        );
                    }

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.error?.message || '댓글 수정에 실패했습니다.');
                    }

                    set({ loading: false });

                    return {
                        success: true,
                        message: '댓글이 성공적으로 수정되었습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '댓글 수정에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            deleteComment: async (slug: string, id: string) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/comments/${id}`, {
                        method: 'DELETE',
                        headers: {
                            Authorization: 'Bearer temp-token', // 임시 토큰
                        },
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message || errorData.message || `삭제에 실패했습니다. (${response.status})`
                        );
                    }

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.error?.message || '댓글 삭제에 실패했습니다.');
                    }

                    set({ loading: false });

                    return {
                        success: true,
                        message: '댓글이 성공적으로 삭제되었습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '댓글 삭제에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },
        }),
        {
            name: 'comment-store',
        }
    )
);
