'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HomeFeaturedCardProps {
    title: string;
    author: string;
    date: string;
    content?: string;
    onClick: () => void;
}

// HTML 태그 제거 함수
function stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
}

export function HomeFeaturedCard({ title, author, date, content, onClick }: HomeFeaturedCardProps) {
    // 날짜 포맷팅 (yyyy.MM.dd 형식)
    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'yyyy.MM.dd', { locale: ko });
        } catch {
            return dateString;
        }
    };

    // HTML 태그 제거된 본문
    const plainContent = content ? stripHtmlTags(content) : '';

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <article
            role="article"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            className={cn(
                'border border-gray-200 rounded-lg p-[20px] cursor-pointer',
                'hover:shadow-md transition-shadow',
                'outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] focus-visible:ring-offset-2'
            )}
        >
            {/* 제목 */}
            <h3 className="text-xl font-semibold text-gray-900 mb-[8px] line-clamp-1">
                {title}
            </h3>

            {/* 메타 정보 (작성자 • 날짜) */}
            <p className="text-sm text-gray-500 mb-[12px]">
                {author} • {formatDate(date)}
            </p>

            {/* 내용 미리보기 */}
            {plainContent && (
                <p className="text-base text-gray-700 line-clamp-2">
                    {plainContent}
                </p>
            )}
        </article>
    );
}
