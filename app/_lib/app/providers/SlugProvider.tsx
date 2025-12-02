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
            setIsLoading(true);
            setLoading(true);
            try {
                const data = await getUnionBySlug(slug);
                
                if (!data) {
                    // 유효하지 않은 slug인 경우 404 처리 또는 홈으로 리다이렉트
                    // 여기서는 일단 에러 처리만 하고, 페이지 컴포넌트에서 notFound() 호출 등을 유도하거나
                    // 리다이렉트 시킬 수 있음. 현재는 단순히 상태 업데이트
                    setError(new Error('Union not found'));
                    // router.push('/404'); // 또는 notFound()
                } else {
                    setLocalUnion(data);
                    setCurrentUnion(data);
                    setError(null);
                }
            } catch (err) {
                console.error('Error in SlugProvider:', err);
                setError(err instanceof Error ? err : new Error('Unknown error'));
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

