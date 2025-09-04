'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAnnouncementStore } from '@/shared/store/announcementStore';
import { useCommunityStore } from '@/shared/store/communityStore';
import { useQnAStore } from '@/shared/store/qnaStore';

interface ErrorRedirectProviderProps {
    children: ReactNode;
}

/**
 * 전역 오류 감지 및 에러 페이지 리다이렉트
 * - 페이지별 로직 없이 공통 Store의 error를 관찰하여
 *   오류 발생 시 '/error'로 이동합니다.
 */
export default function ErrorRedirectProvider({ children }: ErrorRedirectProviderProps) {
    const router = useRouter();
    const pathname = usePathname();

    const { error: announcementError } = useAnnouncementStore();
    const { error: communityError } = useCommunityStore();
    const { error: qnaError } = useQnAStore();

    useEffect(() => {
        // 에러 페이지 자체에서는 재귀 방지
        if (pathname?.startsWith('/error')) return;

        if (announcementError || communityError || qnaError) {
            router.replace('/error');
        }
    }, [announcementError, communityError, qnaError, pathname, router]);

    return <>{children}</>;
}
