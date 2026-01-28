'use client';

import { useSyncExternalStore } from 'react';

/**
 * prefers-reduced-motion 미디어 쿼리 상태를 반환하는 훅
 * @returns boolean - reduced motion 설정이 활성화되어 있으면 true
 */
export function useReducedMotion(): boolean {
    const getSnapshot = () => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    };

    const getServerSnapshot = () => false;

    const subscribe = (callback: () => void) => {
        if (typeof window === 'undefined') return () => {};
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addEventListener('change', callback);
        return () => mediaQuery.removeEventListener('change', callback);
    };

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
