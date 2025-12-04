'use client';

import { create } from 'zustand';
import { Comment } from '@/app/_lib/shared/type/database.types';

/**
 * 댓글 상태 관리 Store
 * 
 * - 댓글 목록 관리
 * - 낙관적 업데이트 지원
 */

interface CommentStore {
    // State
    comments: Comment[];

    // Actions
    setComments: (comments: Comment[]) => void;
    addComment: (comment: Comment) => void;
    updateComment: (id: number, updates: Partial<Comment>) => void;
    removeComment: (id: number) => void;
    reset: () => void;
}

const initialState = {
    comments: [],
};

const useCommentStore = create<CommentStore>((set) => ({
    ...initialState,

    /**
     * 댓글 목록 설정
     */
    setComments: (comments) => set({ comments }),

    /**
     * 댓글 추가 (낙관적 업데이트용)
     */
    addComment: (comment) =>
        set((state) => ({
            comments: [...state.comments, comment],
        })),

    /**
     * 댓글 수정 (낙관적 업데이트용)
     */
    updateComment: (id, updates) =>
        set((state) => ({
            comments: state.comments.map((comment) =>
                comment.id === id ? { ...comment, ...updates } : comment
            ),
        })),

    /**
     * 댓글 삭제 (낙관적 업데이트용)
     * - 해당 댓글의 답글도 함께 삭제
     */
    removeComment: (id) =>
        set((state) => ({
            comments: state.comments.filter(
                (comment) => comment.id !== id && comment.parent_id !== id
            ),
        })),

    /**
     * 상태 초기화
     */
    reset: () => set(initialState),
}));

export default useCommentStore;

