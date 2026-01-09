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
import { formatDate } from '@/app/_lib/shared/utils/commonUtil';

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

    // 실지 삭제 또는 문구 변경 처리
    const handleDelete = () => {
        const hasReplies = comment.replies && comment.replies.length > 0;
        const confirmMessage = hasReplies 
            ? '댓글을 삭제하시겠습니까? 답글이 있어 "삭제된 댓글입니다"로 표시됩니다.' 
            : '댓글을 삭제하시겠습니까?';

        openConfirmModal({
            title: '댓글 삭제',
            message: confirmMessage,
            onConfirm: async () => {
                try {
                    if (hasReplies) {
                        // 답글이 있는 경우: 내용만 변경 (Soft Delete)
                        await updateCommentMutation.mutateAsync({
                            id: comment.id,
                            updates: { content: '삭제된 댓글입니다.' },
                            entityType,
                            entityId,
                        });
                    } else {
                        // 답글이 없는 경우: 실제 삭제
                        await deleteCommentMutation.mutateAsync({
                            id: comment.id,
                            entityType,
                            entityId,
                        });
                    }
                } catch (error) {
                    console.error('Failed to handle comment deletion:', error);
                }
            },
        });
    };

    const isUpdating = updateCommentMutation.isPending;
    const isDeleting = deleteCommentMutation.isPending;
    const isDeleted = comment.content === '삭제된 댓글입니다.';

    return (
        <div className={cn('py-4', isReply && 'pl-8 border-l-2 border-muted ml-4')}>
            {/* 댓글 헤더 */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{isDeleted ? '(삭제됨)' : authorName}</span>
                    <span className="text-xs text-muted-foreground">
                        {formatDate(comment.created_at, true)}
                    </span>
                    {comment.updated_at !== comment.created_at && !isDeleted && (
                        <span className="text-xs text-muted-foreground">(수정됨)</span>
                    )}
                </div>

                {/* 액션 버튼 */}
                {isOwner && !isEditing && !isDeleted && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setIsEditing(true)}
                            disabled={isDeleting || isUpdating}
                            className="cursor-pointer hover:bg-gray-100"
                        >
                            <Pencil className="size-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleDelete}
                            disabled={isDeleting || isUpdating}
                            className="cursor-pointer hover:bg-gray-200"
                        >
                            {isDeleting || isUpdating ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="size-3.5 text-gray-500 hover:text-gray-700" />
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
                            className="cursor-pointer"
                        >
                            취소
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleUpdate}
                            disabled={!editContent.trim() || isUpdating}
                            className="cursor-pointer"
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
                <p className={cn("text-sm whitespace-pre-wrap", isDeleted && "text-muted-foreground italic")}>
                    {comment.content}
                </p>
            )}

            {/* 답글 달기 버튼 (원댓글만, 로그인 상태만, 본인 댓글 제외) */}
            {!isReply && currentUserId && !isEditing && !isOwner && (
                <div className="mt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground h-auto py-1 px-2 cursor-pointer"
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


