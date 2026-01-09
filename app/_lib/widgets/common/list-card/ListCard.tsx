'use client';

import { useState, ReactNode } from 'react';
import { Eye, MessageSquare, User, Calendar, Paperclip, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export interface ListCardItem {
    id: number | string;
    title: string;
    description?: string;
    author: string;
    date: string;
    views: number;
    commentCount?: number;
    hasAttachment?: boolean;
    isMine?: boolean;
    thumbnailUrl?: string | null;
}

export interface ListCardProps {
    items: ListCardItem[];
    onItemClick: (id: number | string) => void;
    emptyMessage?: string;
    showThumbnail?: boolean;
    // 커스텀 슬롯
    renderBadge?: (item: ListCardItem) => ReactNode;
    renderTitlePrefix?: (item: ListCardItem) => ReactNode;
    renderTitleSuffix?: (item: ListCardItem) => ReactNode;
    renderMeta?: (item: ListCardItem) => ReactNode;
}

export interface ListItemProps {
    item: ListCardItem;
    onItemClick: (id: number | string) => void;
    showThumbnail?: boolean;
    renderBadge?: (item: ListCardItem) => ReactNode;
    renderTitlePrefix?: (item: ListCardItem) => ReactNode;
    renderTitleSuffix?: (item: ListCardItem) => ReactNode;
    renderMeta?: (item: ListCardItem) => ReactNode;
}

export function ListItem({
    item,
    onItemClick,
    showThumbnail = false,
    renderBadge,
    renderTitlePrefix,
    renderTitleSuffix,
    renderMeta,
}: ListItemProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={cn(
                'rounded-lg overflow-hidden transition-all duration-200 cursor-pointer',
                'border border-[#E5E7EB]',
                item.isMine && 'bg-[#F0F7F4]'
            )}
            style={{
                backgroundColor: item.isMine
                    ? '#F0F7F4'
                    : isHovered
                    ? '#F9FAFB'
                    : '#ffffff',
                boxShadow:
                    isHovered
                        ? '0 4px 10px rgba(0,0,0,0.06)'
                        : '0 1px 3px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onItemClick(item.id)}
        >
            <div className={cn('p-5', showThumbnail && 'flex gap-4')}>
                {/* 썸네일 (옵션) */}
                {showThumbnail && (
                    <div className="shrink-0">
                        {item.thumbnailUrl ? (
                            <div className="w-[80px] h-[80px] rounded-[8px] overflow-hidden bg-[#E6E6E6] relative">
                                <Image
                                    src={item.thumbnailUrl}
                                    alt="썸네일"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-[80px] h-[80px] rounded-[8px] bg-[#F5F5F5] flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-[#AFAFAF]" />
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    {/* 상단: 제목 + 배지 */}
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {renderTitlePrefix && renderTitlePrefix(item)}
                            <h2 className="text-lg font-medium text-gray-900 truncate">
                                {item.title}
                            </h2>
                            {/* 순서: 팝업(renderTitleSuffix 내부) → 첨부파일 → 내글(renderTitleSuffix 내부) */}
                            {item.hasAttachment && (
                                <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                            )}
                            {renderTitleSuffix && renderTitleSuffix(item)}
                        </div>
                        {renderBadge && (
                            <div className="shrink-0 ml-2">{renderBadge(item)}</div>
                        )}
                    </div>

                    {/* 설명 (있는 경우) */}
                    {item.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {item.description}
                        </p>
                    )}

                    {/* 하단: 메타 정보 */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                                <User size={14} className="mr-1" />
                                <span>{item.author}</span>
                            </div>
                            <div className="flex items-center">
                                <Calendar size={14} className="mr-1" />
                                <span>{item.date}</span>
                            </div>
                            {renderMeta && renderMeta(item)}
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className="flex items-center">
                                <Eye size={14} className="mr-1" />
                                <span>{item.views}</span>
                            </div>
                            {item.commentCount !== undefined && (
                                <div className="flex items-center">
                                    <MessageSquare size={14} className="mr-1" />
                                    <span>{item.commentCount}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ListCard({
    items,
    onItemClick,
    emptyMessage = '등록된 게시글이 없습니다.',
    showThumbnail = false,
    renderBadge,
    renderTitlePrefix,
    renderTitleSuffix,
    renderMeta,
}: ListCardProps) {
    if (!items || items.length === 0) {
        return (
            <div className="w-full p-8 text-center">
                <p className="text-[16px] text-[#AFAFAF]">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-3">
            {items.map((item) => (
                <ListItem
                    key={item.id}
                    item={item}
                    onItemClick={onItemClick}
                    showThumbnail={showThumbnail}
                    renderBadge={renderBadge}
                    renderTitlePrefix={renderTitlePrefix}
                    renderTitleSuffix={renderTitleSuffix}
                    renderMeta={renderMeta}
                />
            ))}
        </div>
    );
}
