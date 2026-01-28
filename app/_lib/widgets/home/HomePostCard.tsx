'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HomePostCardProps {
    title: string;
    author: string;
    date: string;
    onClick: () => void;
}

/**
 * 홈 화면의 게시글 카드 컴포넌트
 * 3열 그리드용 작은 카드 스타일
 */
export function HomePostCard({ title, author, date, onClick }: HomePostCardProps) {
    /**
     * 날짜 문자열을 yyyy.MM.dd 형식으로 포맷팅
     */
    const formatDate = (dateString: string): string => {
        try {
            return format(new Date(dateString), 'yyyy.MM.dd', { locale: ko });
        } catch {
            return dateString;
        }
    };

    /**
     * 키보드 이벤트 핸들러 (Enter, Space)
     */
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            className={cn(
                'border border-gray-200 rounded-lg p-4',
                'cursor-pointer',
                'hover:shadow-md transition-shadow',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] focus-visible:ring-offset-2'
            )}
        >
            {/* 제목 */}
            <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
                {title}
            </h3>

            {/* 메타 정보: 작성자, 날짜 */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="truncate max-w-[100px]" title={author}>
                    {author}
                </span>
                <span className="text-gray-300">|</span>
                <span className="tabular-nums">
                    {formatDate(date)}
                </span>
            </div>
        </div>
    );
}

export default HomePostCard;
