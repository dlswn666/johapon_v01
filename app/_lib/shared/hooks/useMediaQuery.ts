'use client';

import { useSyncExternalStore } from 'react';

/**
 * 미디어 쿼리 상태를 반환하는 훅
 * @param query - CSS 미디어 쿼리 문자열 (예: '(max-width: 768px)')
 * @returns 미디어 쿼리와 일치하면 true
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = (callback: () => void) => {
        if (typeof window === 'undefined') return () => {};
        const mediaQuery = window.matchMedia(query);
        mediaQuery.addEventListener('change', callback);
        return () => mediaQuery.removeEventListener('change', callback);
    };

    const getSnapshot = () => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    };

    const getServerSnapshot = () => false;

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * 모바일 여부를 반환하는 훅 (768px 미만)
 */
export function useIsMobile(): boolean {
    return useMediaQuery('(max-width: 767px)');
}
