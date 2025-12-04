'use client';

import { CommentWithAuthor, EntityType } from '@/app/_lib/features/comment/api/useCommentHook';
import { CommentItem } from './CommentItem';
import { MessageSquareOff } from 'lucide-react';

interface CommentListProps {
    comments: CommentWithAuthor[];
    entityType: EntityType;
    entityId: number;
    currentUserId?: string;
}

/**
 * 댓글 목록 컴포넌트
 * - 댓글 목록 순회 렌더링
 * - 빈 상태 처리
 */
export function CommentList({
    comments,
    entityType,
    entityId,
    currentUserId,
}: CommentListProps) {
    if (comments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquareOff className="size-12 mb-3 opacity-50" />
                <p className="text-sm">아직 댓글이 없습니다.</p>
                <p className="text-xs mt-1">첫 댓글을 남겨보세요!</p>
            </div>
        );
    }

    return (
        <div className="divide-y">
            {comments.map((comment) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    entityType={entityType}
                    entityId={entityId}
                    currentUserId={currentUserId}
                />
            ))}
        </div>
    );
}


