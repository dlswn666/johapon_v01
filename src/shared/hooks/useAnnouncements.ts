'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useInfiniteScroll } from './useInfiniteScroll';
import type {
    AnnouncementApiResponse,
    DbPostWithCategory,
    AnnouncementItem,
    CategoryOption,
} from '@/entities/announcement/model/types';

interface UseAnnouncementsOptions {
    pageSize?: number;
    categoryKey?: string;
    subcategoryId?: string;
    popupOnly?: boolean;
    searchTerm?: string;
}

interface UseAnnouncementsReturn {
    announcements: AnnouncementItem[];
    categories: CategoryOption[];
    subcategories: { id: string; name: string; category_key: string }[];
    loading: boolean;
    error: string | null;
    total: number;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
    setFilter: (options: Partial<UseAnnouncementsOptions>) => void;
    observerRef: (node: HTMLElement | null) => void;
}

// 데이터베이스 포스트를 프론트엔드 타입으로 변환하는 함수
function transformDbPostToAnnouncementItem(post: DbPostWithCategory): AnnouncementItem {
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

    // HTML 태그 제거
    contentText = contentText.replace(/<[^>]*>/g, '').substring(0, 200);

    return {
        id: post.id,
        title: post.title,
        content: contentText,
        author: post.created_by || '관리자',
        date: new Date(post.created_at).toISOString().split('T')[0], // YYYY-MM-DD 형식
        category: post.category_name || '일반공지',
        views: 0, // 현재 DB에 조회수 필드가 없으므로 기본값
        isPinned: post.popup, // popup을 고정 표시로 사용
    };
}

export function useAnnouncements(initialOptions: UseAnnouncementsOptions = {}): UseAnnouncementsReturn {
    const params = useParams();
    const slug = params.homepage as string;

    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [subcategories, setSubcategories] = useState<{ id: string; name: string; category_key: string }[]>([]);
    const [options, setOptions] = useState<UseAnnouncementsOptions>({
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
                category_key: 'notice', // 공지사항 카테고리로 고정
            });

            // 필터 조건 추가
            if (options.categoryKey && options.categoryKey !== 'all') {
                queryParams.set('category_key', options.categoryKey);
            }
            if (options.subcategoryId) {
                queryParams.set('subcategory_id', options.subcategoryId);
            }
            if (options.popupOnly) {
                queryParams.set('popup', 'true');
            }
            if (options.searchTerm) {
                queryParams.set('search', options.searchTerm);
            }

            const response = await fetch(`/api/tenant/${slug}/notices?${queryParams}`);

            if (!response.ok) {
                throw new Error(`API 호출 실패: ${response.status}`);
            }

            const data: AnnouncementApiResponse = await response.json();

            // 데이터 변환
            const transformedAnnouncements = data.items.map(transformDbPostToAnnouncementItem);

            return {
                items: transformedAnnouncements,
                total: data.total,
                hasMore: data.items.length === pageSize, // 요청한 개수만큼 왔으면 더 있을 가능성
            };
        },
        [slug, options]
    );

    // 무한 스크롤 훅 사용
    const {
        data: announcements,
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

    // 카테고리 및 서브카테고리 가져오기
    const fetchMeta = useCallback(async () => {
        if (!slug) return;

        try {
            const response = await fetch(`/api/tenant/${slug}/meta`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // 카테고리를 CategoryOption 형태로 변환
                    const categoryOptions: CategoryOption[] = [
                        { id: 'all', key: 'all', name: '전체' },
                        ...(data.data?.categories || []).map((cat: any) => ({
                            id: cat.key,
                            key: cat.key,
                            name: cat.name,
                        })),
                    ];

                    setCategories(categoryOptions);
                    setSubcategories(data.data?.subcategories || []);
                }
            }
        } catch (err) {
            console.error('메타 정보 가져오기 실패:', err);
        }
    }, [slug]);

    // 초기 메타 정보 로드
    useEffect(() => {
        fetchMeta();
    }, [fetchMeta]);

    // 필터 변경 시 데이터 새로고침
    const setFilter = useCallback(
        (newOptions: Partial<UseAnnouncementsOptions>) => {
            setOptions((prev) => ({ ...prev, ...newOptions }));
            // 필터 변경 후 데이터 새로고침
            setTimeout(() => {
                refresh();
            }, 0);
        },
        [refresh]
    );

    return {
        announcements,
        categories,
        subcategories,
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
