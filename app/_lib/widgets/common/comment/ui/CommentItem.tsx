'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    CommentWithAuthor,
    EntityType,
    useUpdateComment,
    useDeleteComment,
} from '@/app/_lib/features/comment/api/useCommentHook';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { CommentForm } from './CommentForm';
import { MessageSquare, Pencil, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentItemProps {
    comment: CommentWithAuthor;
    entityType: EntityType;
    entityId: number;
    currentUserId?: string;
    isReply?: boolean;
}

/**
 * 개별 댓글 컴포넌트
 * - 작성자, 내용, 작성일 표시
 * - 수정/삭제 (본인만)
 * - 답글 달기 (원댓글만)
 */
export function CommentItem({
    comment,
    entityType,
    entityId,
    currentUserId,
    isReply = false,
}: CommentItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [showReplyForm, setShowReplyForm] = useState(false);

    const updateCommentMutation = useUpdateComment();
    const deleteCommentMutation = useDeleteComment();
    const { openConfirmModal } = useModalStore();

    const isOwner = currentUserId === comment.author_id;
    const authorName = comment.author?.name || '알 수 없음';

    // 날짜 포맷
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // 수정 처리
    const handleUpdate = async () => {
        if (!editContent.trim()) return;

        try {
            await updateCommentMutation.mutateAsync({
                id: comment.id,
                updates: { content: editContent.trim() },
                entityType,
                entityId,
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update comment:', error);
        }
    };

    // 삭제 처리
    const handleDelete = () => {
        openConfirmModal({
            title: '댓글 삭제',
            message: '댓글을 삭제하시겠습니까? 답글도 함께 삭제됩니다.',
            onConfirm: async () => {
                try {
                    await deleteCommentMutation.mutateAsync({
                        id: comment.id,
                        entityType,
                        entityId,
                    });
                } catch (error) {
                    console.error('Failed to delete comment:', error);
                }
            },
        });
    };

    const isUpdating = updateCommentMutation.isPending;
    const isDeleting = deleteCommentMutation.isPending;

    return (
        <div className={cn('py-4', isReply && 'pl-8 border-l-2 border-muted ml-4')}>
            {/* 댓글 헤더 */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{authorName}</span>
                    <span className="text-xs text-muted-foreground">
                        {formatDate(comment.created_at)}
                    </span>
                    {comment.updated_at !== comment.created_at && (
                        <span className="text-xs text-muted-foreground">(수정됨)</span>
                    )}
                </div>

                {/* 액션 버튼 */}
                {isOwner && !isEditing && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setIsEditing(true)}
                            disabled={isDeleting}
                        >
                            <Pencil className="size-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="size-3.5" />
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* 댓글 내용 */}
            {isEditing ? (
                <div className="space-y-2">
                    <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] resize-none"
                        disabled={isUpdating}
                    />
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setIsEditing(false);
                                setEditContent(comment.content);
                            }}
                            disabled={isUpdating}
                        >
                            취소
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleUpdate}
                            disabled={!editContent.trim() || isUpdating}
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    수정 중...
                                </>
                            ) : (
                                '수정'
                            )}
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            )}

            {/* 답글 달기 버튼 (원댓글만, 로그인 상태만) */}
            {!isReply && currentUserId && !isEditing && (
                <div className="mt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground h-auto py-1 px-2"
                        onClick={() => setShowReplyForm(!showReplyForm)}
                    >
                        <MessageSquare className="size-3 mr-1" />
                        답글
                    </Button>
                </div>
            )}

            {/* 답글 입력 폼 */}
            {showReplyForm && currentUserId && (
                <div className="mt-3 pl-4 border-l-2 border-muted">
                    <CommentForm
                        entityType={entityType}
                        entityId={entityId}
                        parentId={comment.id}
                        authorId={currentUserId}
                        placeholder="답글을 입력하세요..."
                        autoFocus
                        onSuccess={() => setShowReplyForm(false)}
                        onCancel={() => setShowReplyForm(false)}
                    />
                </div>
            )}

            {/* 답글 목록 */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 space-y-0 divide-y">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            entityType={entityType}
                            entityId={entityId}
                            currentUserId={currentUserId}
                            isReply
                        />
                    ))}
                </div>
            )}
        </div>
    );
}


