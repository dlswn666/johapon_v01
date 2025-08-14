'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useInfiniteScroll } from './useInfiniteScroll';

interface UseInfoShareOptions {
    pageSize?: number;
    categoryKey?: string;
    searchTerm?: string;
}

interface InfoShareApiResponse {
    items: InfoShareDbItem[];
    page: number;
    page_size: number;
    total: number;
}

interface InfoShareDbItem {
    id: string;
    title: string;
    content: string;
    created_by: string;
    created_at: string;
    updated_at?: string;
    category_id: string;
    subcategory_id?: string;
}

interface InfoShareItem {
    id: string;
    title: string;
    content: string;
    author: string;
    date: string;
    category: string;
    views: number;
    likes?: number;
    isLiked?: boolean;
    commentsCount?: number;
}

interface UseInfoShareReturn {
    posts: InfoShareItem[];
    categories: { id: string; name: string; count: number }[];
    loading: boolean;
    error: string | null;
    total: number;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
    setFilter: (options: Partial<UseInfoShareOptions>) => void;
    observerRef: (node: HTMLElement | null) => void;
}

// 데이터베이스 정보공유방을 프론트엔드 타입으로 변환하는 함수
function transformDbInfoShareToItem(post: InfoShareDbItem): InfoShareItem {
    // content가 JSON 형식인지 확인하고 파싱
    let contentText = post.content;
    try {
        const parsed = JSON.parse(post.content);
        if (Array.isArray(parsed)) {
            // Quill.js 델타 형식인 경우 텍스트만 추출
            contentText = parsed
                .map((op: any) => (typeof op.insert === 'string' ? op.insert : ''))
                .join('')
                .trim();
        }
    } catch {
        // JSON이 아닌 경우 그대로 사용
        contentText = post.content;
    }

    // HTML 태그 제거 및 길이 제한
    contentText = contentText.replace(/<[^>]*>/g, '').substring(0, 200);

    return {
        id: post.id,
        title: post.title,
        content: contentText,
        author: post.created_by || '익명',
        date: new Date(post.created_at).toISOString().split('T')[0], // YYYY-MM-DD 형식
        category: '정보공유',
        views: 0, // 현재 DB에 조회수 필드가 없으므로 기본값
        likes: 0,
        isLiked: false,
        commentsCount: 0,
    };
}

export function useInfoShare(initialOptions: UseInfoShareOptions = {}): UseInfoShareReturn {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.homepage as string;

    const [categories] = useState([
        { id: 'all', name: '전체', count: 0 },
        { id: '정보공유', name: '정보공유', count: 0 },
        { id: '자유토론', name: '자유토론', count: 0 },
        { id: '생활정보', name: '생활정보', count: 0 },
        { id: '추천정보', name: '추천정보', count: 0 },
    ]);

    const [options, setOptions] = useState<UseInfoShareOptions>({
        pageSize: 10,
        ...initialOptions,
    });

    // 무한 스크롤을 위한 데이터 fetch 함수
    const fetchData = useCallback(
        async (page: number, pageSize: number) => {
            if (!slug) {
                throw new Error('테넌트 정보가 없습니다.');
            }

            const queryParams = new URLSearchParams({
                page: String(page),
                page_size: String(pageSize),
            });

            // 검색 조건 추가
            if (options.searchTerm) {
                queryParams.set('search', options.searchTerm);
            }

            const response = await fetch(`/api/tenant/${slug}/boards/share?${queryParams}`);

            if (!response.ok) {
                let errorMessage = `API 호출 실패 (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error?.message || errorData.message || errorMessage;
                } catch {
                    // JSON 파싱 실패 시 기본 메시지 사용
                }
                throw new Error(errorMessage);
            }

            const responseData = await response.json();

            // API 응답 구조 확인 및 데이터 추출
            if (!responseData.success) {
                throw new Error(responseData.error?.message || 'API 호출이 실패했습니다.');
            }

            const data: InfoShareApiResponse = responseData.data;

            // 데이터 변환
            const transformedPosts = data.items.map(transformDbInfoShareToItem);

            return {
                items: transformedPosts,
                total: data.total,
                hasMore: data.items.length === pageSize, // 요청한 개수만큼 왔으면 더 있을 가능성
            };
        },
        [slug, options]
    );

    // 무한 스크롤 훅 사용
    const {
        data: posts,
        loading,
        error,
        hasMore,
        total,
        loadMore,
        refresh,
        observerRef,
    } = useInfiniteScroll({
        fetchData,
        pageSize: options.pageSize || 10,
        enabled: !!slug,
    });

    // URL 파라미터 변화 감지하여 새로고침 트리거
    const refreshParam = searchParams?.get('refresh');
    const [lastRefresh, setLastRefresh] = useState<string | null>(null);

    useEffect(() => {
        if (refreshParam && refreshParam !== lastRefresh) {
            setLastRefresh(refreshParam);
            // 강제 새로고침 실행
            setTimeout(() => {
                refresh();
                // URL에서 refresh 파라미터 제거 (선택사항)
                if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('refresh');
                    window.history.replaceState({}, '', url.toString());
                }
            }, 100);
        }
    }, [refreshParam, lastRefresh, refresh]);

    // 필터 변경 시 데이터 새로고침
    const setFilter = useCallback(
        (newOptions: Partial<UseInfoShareOptions>) => {
            setOptions((prev) => ({ ...prev, ...newOptions }));
            // 필터 변경 후 데이터 새로고침
            setTimeout(() => {
                refresh();
            }, 0);
        },
        [refresh]
    );

    return {
        posts,
        categories,
        loading,
        error,
        total,
        hasMore,
        loadMore,
        refresh,
        setFilter,
        observerRef,
    };
}
