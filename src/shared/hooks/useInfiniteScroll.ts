'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface InfiniteScrollOptions<T> {
    /** 데이터를 가져오는 함수 */
    fetchData: (
        page: number,
        pageSize: number
    ) => Promise<{
        items: T[];
        total: number;
        hasMore: boolean;
    }>;
    /** 페이지당 데이터 개수 (기본값: 10) */
    pageSize?: number;
    /** 자동으로 다음 페이지를 로드할지 여부 (기본값: true) */
    enabled?: boolean;
    /** 트리거 요소와의 거리 임계값 (픽셀, 기본값: 100) */
    threshold?: number;
}

export interface InfiniteScrollReturn<T> {
    /** 현재까지 로드된 모든 데이터 */
    data: T[];
    /** 로딩 상태 */
    loading: boolean;
    /** 에러 상태 */
    error: string | null;
    /** 더 많은 데이터가 있는지 여부 */
    hasMore: boolean;
    /** 전체 데이터 개수 */
    total: number;
    /** 현재 페이지 */
    currentPage: number;
    /** 수동으로 다음 페이지 로드 */
    loadMore: () => Promise<void>;
    /** 데이터 새로고침 (첫 페이지부터) */
    refresh: () => Promise<void>;
    /** 무한 스크롤 감지를 위한 ref */
    observerRef: (node: HTMLElement | null) => void;
}

export function useInfiniteScroll<T>({
    fetchData,
    pageSize = 10,
    enabled = true,
    threshold = 100,
}: InfiniteScrollOptions<T>): InfiniteScrollReturn<T> {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    const observerRef = useRef<IntersectionObserver | null>(null);
    const isLoadingRef = useRef(false);

    const loadMore = useCallback(async () => {
        if (!enabled || isLoadingRef.current || !hasMore) return;

        isLoadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const result = await fetchData(currentPage, pageSize);

            setData((prev) => (currentPage === 1 ? result.items : [...prev, ...result.items]));
            setTotal(result.total);
            setHasMore(result.hasMore);
            setCurrentPage((prev) => prev + 1);
        } catch (err) {
            console.error('데이터 로드 실패:', err);
            setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [fetchData, currentPage, pageSize, enabled, hasMore]);

    const refresh = useCallback(async () => {
        setData([]);
        setCurrentPage(1);
        setHasMore(true);
        setError(null);
        isLoadingRef.current = false;

        // 페이지를 1로 리셋한 후 loadMore 호출
        setTimeout(() => {
            loadMore();
        }, 0);
    }, [loadMore]);

    // Intersection Observer 설정
    const observerRefCallback = useCallback(
        (node: HTMLElement | null) => {
            if (loading) return;
            if (observerRef.current) observerRef.current.disconnect();

            if (node) {
                observerRef.current = new IntersectionObserver(
                    (entries) => {
                        if (entries[0].isIntersecting && hasMore && enabled) {
                            loadMore();
                        }
                    },
                    {
                        rootMargin: `${threshold}px`,
                    }
                );
                observerRef.current.observe(node);
            }
        },
        [loading, hasMore, enabled, threshold, loadMore]
    );

    // 컴포넌트 언마운트 시 observer 정리
    useEffect(() => {
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    // 초기 데이터 로드
    useEffect(() => {
        if (enabled && data.length === 0 && !isLoadingRef.current) {
            loadMore();
        }
    }, [enabled, data.length, loadMore]);

    return {
        data,
        loading,
        error,
        hasMore,
        total,
        currentPage: Math.max(1, currentPage - 1), // 실제 로드된 페이지 수
        loadMore,
        refresh,
        observerRef: observerRefCallback,
    };
}
