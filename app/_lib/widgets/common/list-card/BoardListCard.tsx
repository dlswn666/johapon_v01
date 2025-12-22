'use client';

import React from 'react';
import { User as UserIcon } from 'lucide-react';
import ListCard, { ListCardItem } from './ListCard';

interface BoardListCardProps {
    items: ListCardItem[];
    onItemClick: (id: number | string) => void;
    emptyMessage?: string;
    showThumbnail?: boolean;
}

/**
 * 게시판 전용 리스트 카드 위젯
 * '내 글' 표시 등 공통 로직이 포함되어 있습니다.
 */
export function BoardListCard({
    items,
    onItemClick,
    emptyMessage,
    showThumbnail = false,
}: BoardListCardProps) {
    // 내 글 표시 렌더링
    const renderTitleSuffix = (item: ListCardItem) => {
        if (!item.isMine) return null;

        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#5FA37C] text-white text-[10px] rounded-full shrink-0">
                <UserIcon className="h-3 w-3" />내 글
            </span>
        );
    };

    return (
        <ListCard
            items={items}
            onItemClick={onItemClick}
            emptyMessage={emptyMessage}
            showThumbnail={showThumbnail}
            renderTitleSuffix={renderTitleSuffix}
        />
    );
}
