import { useState, useEffect } from 'react';
import type { MenuItem } from '@/lib/types';

interface NavigationData {
    menus: MenuItem[];
    role: string;
    unionId: string;
}

interface UseNavigationProps {
    slug?: string;
    userRole?: 'member' | 'admin' | 'systemadmin';
    enabled?: boolean;
}

export function useNavigation({ slug, userRole = 'member', enabled = true }: UseNavigationProps = {}) {
    const [data, setData] = useState<NavigationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled || !slug) {
            return;
        }

        const fetchNavigation = async () => {
            try {
                setLoading(true);
                setError(null);

                const params = new URLSearchParams({
                    role: userRole,
                });

                const response = await fetch(`/api/tenant/${slug}/menus?${params}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    setData(result.data);
                } else {
                    throw new Error(result.message || '메뉴 데이터를 불러오는데 실패했습니다.');
                }
            } catch (err) {
                console.error('Navigation fetch error:', err);
                setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchNavigation();
    }, [slug, userRole, enabled]);

    const refetch = () => {
        if (slug && enabled) {
            setData(null);
            setError(null);
        }
    };

    return {
        data,
        loading,
        error,
        refetch,
        menus: data?.menus || [],
        userRole: data?.role || userRole,
        unionId: data?.unionId || null,
    };
}
