'use client';

import { useIsClient } from '@/app/_lib/shared/hooks/useIsClient';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ClientDateProps {
    date: string | Date;
    formatString?: string;
    relative?: boolean;
    fallback?: string;
}

export function ClientDate({
    date,
    formatString = 'yyyy.MM.dd',
    relative = false,
    fallback = '-',
}: ClientDateProps) {
    const isClient = useIsClient();

    // 서버에서는 빈 스팬 렌더링 (Hydration 불일치 방지)
    if (!isClient) {
        return <span className="text-transparent">{fallback}</span>;
    }

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (relative) {
        return (
            <span>
                {formatDistanceToNow(dateObj, { addSuffix: true, locale: ko })}
            </span>
        );
    }

    return <span>{format(dateObj, formatString, { locale: ko })}</span>;
}
