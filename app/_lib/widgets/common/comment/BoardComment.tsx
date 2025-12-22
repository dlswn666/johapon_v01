'use client';

import React from 'react';
import { CommentSection } from './ui/CommentSection';
import { EntityType } from '@/app/_lib/features/comment/api/useCommentHook';

interface BoardCommentProps {
    entityType: EntityType;
    entityId: number;
    title?: string;
    className?: string;
}

/**
 * 게시판용 댓글 위젯
 * 기본적으로 패딩과 테두리가 없는 스타일로 제공됩니다.
 */
export function BoardComment({
    entityType,
    entityId,
    title,
    className,
}: BoardCommentProps) {
    return (
        <CommentSection
            entityType={entityType}
            entityId={entityId}
            title={title}
            className={className}
            noPadding={true}
            noBorder={true}
        />
    );
}
