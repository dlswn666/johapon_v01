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
            console.log('[SlugProvider] 🔍 Fetching union for slug:', slug);
            setIsLoading(true);
            setLoading(true);
            try {
                const data = await getUnionBySlug(slug);
                console.log('[SlugProvider] 📦 Union data result:', data ? { id: data.id, name: data.name, slug: data.slug } : 'null');
                
                if (!data) {
                    console.error('[SlugProvider] ❌ Union not found for slug:', slug);
                    // 유효하지 않은 slug인 경우 404 페이지로 리다이렉트
                    setError(new Error('Union not found'));
                    router.replace('/not-found');
                    return;
                }
                
                setLocalUnion(data);
                setCurrentUnion(data);
                setError(null);
            } catch (err) {
                console.error('[SlugProvider] 💥 Error in SlugProvider:', err);
                setError(err instanceof Error ? err : new Error('Unknown error'));
                // 에러 발생 시에도 404로 리다이렉트
                router.replace('/not-found');
            } finally {
                setIsLoading(false);
                setLoading(false);
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

