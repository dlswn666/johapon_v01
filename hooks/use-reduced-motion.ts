'use client';

import { useState, useEffect } from 'react';

/**
 * prefers-reduced-motion 미디어 쿼리 상태를 반환하는 훅
 * @returns boolean - reduced motion 설정이 활성화되어 있으면 true
 */
export function useReducedMotion(): boolean {
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        // SSR 환경에서는 기본값 유지
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mediaQuery.matches);

        const handler = (event: MediaQueryListEvent) => {
            setReducedMotion(event.matches);
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return reducedMotion;
}
