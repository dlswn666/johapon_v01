'use client';

import { useComments, EntityType } from '@/app/_lib/features/comment/api/useCommentHook';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// TODO: 실제 로그인 시스템 연동 후 제거
const TEMP_USER_ID = 'systemAdmin';

interface CommentSectionProps {
    entityType: EntityType;
    entityId: number;
    className?: string;
    title?: string;
    noPadding?: boolean;
    noBorder?: boolean;
}

/**
 * 댓글 섹션 메인 컨테이너
 * 
 * 사용 예시:
 * ```tsx
 * <CommentSection 
 *   entityType="notice" 
 *   entityId={noticeId} 
 * />
 * ```
 */
export function CommentSection({
    entityType,
    entityId,
    className,
    title = '댓글',
    noPadding = false,
    noBorder = false,
}: CommentSectionProps) {
    // TODO: 실제 로그인 시스템 연동 시 아래 주석 해제
    // const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const currentUserId = TEMP_USER_ID;

    // 댓글 목록 조회
    const {
        data: comments = [],
        isLoading: isCommentsLoading,
        isError,
        error,
    } = useComments(entityType, entityId);

    const commentCount = comments.reduce(
        (acc, comment) => acc + 1 + (comment.replies?.length || 0),
        0
    );

    return (
        <Card className={cn(
            'w-full',
            noBorder && 'border-none shadow-none bg-transparent',
            className
        )}>
            <CardHeader className={cn('pb-3', noPadding && 'px-0 pt-0')}>
                <CardTitle className="flex items-center gap-2 text-lg py-4 px-6">
                    <MessageSquare className="size-5" />
                    {title}
                    {!isCommentsLoading && (
                        <span className="text-sm font-normal text-muted-foreground">
                            ({commentCount})
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className={cn('space-y-4', noPadding && 'px-0 pb-6')}>
                {/* 댓글 입력 폼 */}
                <div className={cn(noPadding && 'px-6')}>
                    <CommentForm
                        entityType={entityType}
                        entityId={entityId}
                        authorId={currentUserId}
                    />
                </div>

                {/* 구분선 */}
                <div className="border-t mx-6" />

                {/* 댓글 목록 */}
                <div className={cn(noPadding && 'px-6')}>
                {isCommentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                ) : isError ? (
                    <div className="text-center py-8 text-destructive">
                        <p className="text-sm">댓글을 불러오는데 실패했습니다.</p>
                        <p className="text-xs mt-1">{error?.message}</p>
                    </div>
                ) : (
                    <CommentList
                        comments={comments}
                        entityType={entityType}
                        entityId={entityId}
                        currentUserId={currentUserId}
                    />
                )}
                </div>
            </CardContent>
        </Card>
    );
}
