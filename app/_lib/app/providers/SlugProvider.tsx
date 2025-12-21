'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUnionBySlug } from '@/app/_lib/shared/lib/utils/slug';
import { useUnionStore } from '@/app/_lib/entities/union/model/useUnionStore';
import { Union } from '@/app/_lib/shared/type/database.types';

interface SlugContextType {
    slug: string;
    union: Union | null;
    isLoading: boolean;
}

const SlugContext = createContext<SlugContextType>({
    slug: '',
    union: null,
    isLoading: true,
});

export const useSlug = () => useContext(SlugContext);

interface SlugProviderProps {
    children: React.ReactNode;
    slug: string;
}

export default function SlugProvider({ children, slug }: SlugProviderProps) {
    const router = useRouter();
    const { setCurrentUnion, setLoading, setError } = useUnionStore();
    const [union, setLocalUnion] = useState<Union | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUnion = async () => {
            console.log('[SLUG_DEBUG] 🚀 fetchUnion 시작:', slug);
            setIsLoading(true);
            setLoading(true);

            // 타임아웃 헬퍼 (5초)
            const timeout = (ms: number) => new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
            );

            try {
                console.log('[SLUG_DEBUG] ⏳ getUnionBySlug 호출 중...');
                const data = await Promise.race([
                    getUnionBySlug(slug),
                    timeout(5000) as Promise<never>
                ]);
                console.log('[SLUG_DEBUG] 📦 조회 결과:', data ? '성공' : '실패');
                
                if (!data) {
                    console.warn('[SLUG_DEBUG] ⚠️ Union not found, redirecting...');
                    setError(new Error('Union not found'));
                    router.replace('/not-found');
                    return;
                }
                
                setLocalUnion(data);
                setCurrentUnion(data);
                setError(null);
            } catch (err) {
                console.error('[SLUG_DEBUG] 💥 fetchUnion 에러 (타임아웃 포함):', err);
                setError(err instanceof Error ? err : new Error('Unknown error'));
                router.replace('/not-found');
            } finally {
                setIsLoading(false);
                setLoading(false);
                console.log('[SLUG_DEBUG] 🔚 fetchUnion 종료 (isLoading: false)');
            }
        };

        if (slug) {
            fetchUnion();
        }
    }, [slug, setCurrentUnion, setLoading, setError, router]);

    return (
        <SlugContext.Provider value={{ slug, union, isLoading }}>
            {children}
        </SlugContext.Provider>
    );
}

