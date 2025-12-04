'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAddComment, EntityType } from '@/app/_lib/features/comment/api/useCommentHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { Loader2 } from 'lucide-react';

interface CommentFormProps {
    entityType: EntityType;
    entityId: number;
    parentId?: number;
    authorId: string;
    onSuccess?: () => void;
    onCancel?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
}

/**
 * 댓글 입력 폼 컴포넌트
 * - 새 댓글 또는 답글 작성
 * - parentId가 있으면 답글로 처리
 */
export function CommentForm({
    entityType,
    entityId,
    parentId,
    authorId,
    onSuccess,
    onCancel,
    placeholder = '댓글을 입력하세요...',
    autoFocus = false,
}: CommentFormProps) {
    const [content, setContent] = useState('');
    const { union } = useSlug();
    const addCommentMutation = useAddComment();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim() || !authorId) return;

        try {
            await addCommentMutation.mutateAsync({
                entity_type: entityType,
                entity_id: entityId,
                parent_id: parentId || null,
                author_id: authorId,
                content: content.trim(),
                union_id: union?.id,
            });

            setContent('');
            onSuccess?.();
        } catch (error) {
            console.error('Failed to add comment:', error);
        }
    };

    const isSubmitting = addCommentMutation.isPending;

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                disabled={isSubmitting}
                autoFocus={autoFocus}
                className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end gap-2">
                {onCancel && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        취소
                    </Button>
                )}
                <Button
                    type="submit"
                    size="sm"
                    disabled={!content.trim() || isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            등록 중...
                        </>
                    ) : (
                        '등록'
                    )}
                </Button>
            </div>
        </form>
    );
}


