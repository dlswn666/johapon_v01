import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

export interface Subcategory {
    id: string;
    name: string;
}

export interface CategoryInfo {
    id: string;
    name: string;
    key: string;
}

export interface UseSubcategoriesReturn {
    subcategories: Subcategory[];
    category: CategoryInfo | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useSubcategories(categoryKey: 'qna' | 'community'): UseSubcategoriesReturn {
    const params = useParams();
    const homepage = params?.homepage as string;

    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [category, setCategory] = useState<CategoryInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSubcategories = useCallback(async () => {
        if (!homepage || !categoryKey) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const url = `/api/tenant/${homepage}/subcategories?category=${categoryKey}`;

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '서브카테고리를 불러오는데 실패했습니다');
            }

            const response_data = await response.json();

            // API 응답이 {success: true, data: {category, subcategories}} 형태로 래핑되어 있음
            const actualData = response_data.data || response_data;

            setCategory(actualData.category);
            setSubcategories(actualData.subcategories || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
        } finally {
            setIsLoading(false);
        }
    }, [homepage, categoryKey]);

    useEffect(() => {
        fetchSubcategories();
    }, [homepage, categoryKey, fetchSubcategories]);

    return {
        subcategories,
        category,
        isLoading,
        error,
        refetch: fetchSubcategories,
    };
}
