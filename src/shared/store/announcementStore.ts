import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
    AnnouncementItem,
    AnnouncementDetail,
    AnnouncementCreateData,
    AnnouncementUpdateData,
    CategoryOption,
    DbAnnouncementWithCategory,
} from '@/entities/announcement/model/types';

interface Subcategory {
    id: string;
    name: string;
    category_key: string;
}

interface AnnouncementState {
    // 상태
    announcements: AnnouncementItem[];
    currentAnnouncement: AnnouncementDetail | null;
    categories: CategoryOption[];
    subcategories: Subcategory[];
    loading: boolean;
    error: string | null;
    total: number;
    hasMore: boolean;
    page: number;
    pageSize: number;
    filters: {
        categoryKey?: string;
        subcategoryId?: string;
        searchTerm?: string;
        popupOnly?: boolean;
    };

    // 액션
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setAnnouncements: (announcements: AnnouncementItem[]) => void;
    addAnnouncements: (announcements: AnnouncementItem[]) => void;
    setCurrentAnnouncement: (announcement: AnnouncementDetail | null) => void;
    setCategories: (categories: CategoryOption[]) => void;
    setSubcategories: (subcategories: Subcategory[]) => void;
    setTotal: (total: number) => void;
    setHasMore: (hasMore: boolean) => void;
    setPage: (page: number) => void;
    setFilters: (filters: Partial<AnnouncementState['filters']>) => void;
    resetState: () => void;

    // API 호출 액션
    fetchAnnouncements: (slug: string, reset?: boolean) => Promise<void>;
    fetchAnnouncementDetail: (slug: string, id: string) => Promise<void>;
    createAnnouncement: (
        slug: string,
        data: AnnouncementCreateData & { sendNotification: boolean }
    ) => Promise<{ success: boolean; id?: string; message: string }>;
    updateAnnouncement: (
        slug: string,
        id: string,
        data: AnnouncementUpdateData
    ) => Promise<{ success: boolean; message: string }>;
    deleteAnnouncement: (slug: string, id: string) => Promise<{ success: boolean; message: string }>;
    fetchMetadata: (slug: string) => Promise<void>;
}

// 데이터 변환 함수
function transformDbAnnouncementToItem(announcement: DbAnnouncementWithCategory): AnnouncementItem {
    let contentText = announcement.content;
    try {
        const parsed = JSON.parse(announcement.content);
        if (Array.isArray(parsed)) {
            contentText = parsed
                .map((op: any) => (typeof op.insert === 'string' ? op.insert : ''))
                .join('')
                .trim();
        }
    } catch {
        contentText = announcement.content;
    }

    contentText = contentText.replace(/<[^>]*>/g, '').substring(0, 200);

    return {
        id: announcement.id,
        title: announcement.title,
        content: contentText,
        author: `${announcement.creator?.name || announcement.author_name || '관리자'}님`,
        date: new Date(announcement.created_at).toISOString().split('T')[0],
        category: announcement.subcategory_name || announcement.category_name || '일반공지',
        views: announcement.view_count || 0,
        isPinned: announcement.is_pinned || false,
        isUrgent: announcement.is_urgent || false,
        priority: announcement.priority || 0,
        popup: announcement.popup || false,
        publishedAt: announcement.published_at || undefined,
        expiresAt: announcement.expires_at || undefined,
        alrimtalkSent: announcement.alrimtalk_sent || false,
        alrimtalkSentAt: announcement.alrimtalk_sent_at || undefined,
        subcategory_id: announcement.subcategory_id || undefined,
    };
}

function transformDbAnnouncementToDetail(announcement: DbAnnouncementWithCategory): AnnouncementDetail {
    const item = transformDbAnnouncementToItem(announcement);
    return {
        ...item,
        content: announcement.content, // 상세에서는 원본 컨텐츠 사용
        created_at: announcement.created_at,
        updated_at: announcement.updated_at || undefined,
        author_name: announcement.creator?.name
            ? `${announcement.creator.name}님`
            : announcement.author_name
            ? `${announcement.author_name}님`
            : undefined,
        // 수정 API용 필드들
        published_at: announcement.published_at || undefined,
        expires_at: announcement.expires_at || undefined,
        is_urgent: announcement.is_urgent,
        is_pinned: announcement.is_pinned,
    };
}

export const useAnnouncementStore = create<AnnouncementState>()(
    devtools(
        (set, get) => ({
            // 초기 상태
            announcements: [],
            currentAnnouncement: null,
            categories: [],
            subcategories: [],
            loading: false,
            error: null,
            total: 0,
            hasMore: false,
            page: 1,
            pageSize: 10,
            filters: {},

            // 기본 액션
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),
            setAnnouncements: (announcements) => set({ announcements }),
            addAnnouncements: (newAnnouncements) =>
                set((state) => ({
                    announcements: [...state.announcements, ...newAnnouncements],
                })),
            setCurrentAnnouncement: (announcement) => set({ currentAnnouncement: announcement }),
            setCategories: (categories) => set({ categories }),
            setSubcategories: (subcategories) => set({ subcategories }),
            setTotal: (total) => set({ total }),
            setHasMore: (hasMore) => set({ hasMore }),
            setPage: (page) => set({ page }),
            setFilters: (filters) =>
                set((state) => ({
                    filters: { ...state.filters, ...filters },
                })),
            resetState: () =>
                set({
                    announcements: [],
                    currentAnnouncement: null,
                    loading: false,
                    error: null,
                    total: 0,
                    hasMore: false,
                    page: 1,
                    filters: {},
                }),

            // API 호출 액션
            fetchAnnouncements: async (slug: string, reset = false) => {
                const { page, pageSize, filters } = get();
                const currentPage = reset ? 1 : page;

                set({ loading: true, error: null });

                try {
                    const queryParams = new URLSearchParams({
                        page: String(currentPage),
                        page_size: String(pageSize),
                    });

                    if (filters.categoryKey && filters.categoryKey !== 'all') {
                        queryParams.set('category_key', filters.categoryKey);
                    }
                    if (filters.subcategoryId) {
                        queryParams.set('subcategory_id', filters.subcategoryId);
                    }
                    if (filters.popupOnly) {
                        queryParams.set('popup', 'true');
                    }
                    if (filters.searchTerm) {
                        queryParams.set('search', filters.searchTerm);
                    }

                    const response = await fetch(`/api/tenant/${slug}/notices?${queryParams}`);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message || errorData.message || `API 호출 실패 (${response.status})`
                        );
                    }

                    const responseData = await response.json();

                    if (!responseData.success) {
                        throw new Error(responseData.error?.message || 'API 호출이 실패했습니다.');
                    }

                    const data = responseData.data;
                    if (!data || !Array.isArray(data.items)) {
                        throw new Error('API 응답 데이터 형식이 올바르지 않습니다.');
                    }

                    const transformedAnnouncements = data.items.map(transformDbAnnouncementToItem);

                    set((state) => ({
                        announcements: reset
                            ? transformedAnnouncements
                            : [...state.announcements, ...transformedAnnouncements],
                        total: data.total,
                        hasMore: data.items.length === pageSize,
                        page: currentPage + 1,
                        loading: false,
                    }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error; // 에러를 다시 throw하여 컴포넌트에서 처리할 수 있도록
                }
            },

            fetchAnnouncementDetail: async (slug: string, id: string) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/notices/${id}`);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message ||
                                errorData.message ||
                                `공지사항을 찾을 수 없습니다. (${response.status})`
                        );
                    }

                    const responseData = await response.json();

                    if (!responseData.success) {
                        throw new Error(responseData.error?.message || '공지사항을 불러올 수 없습니다.');
                    }

                    const announcement = transformDbAnnouncementToDetail(responseData.data);
                    set({ currentAnnouncement: announcement, loading: false });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '공지사항을 불러올 수 없습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            createAnnouncement: async (slug: string, data: AnnouncementCreateData & { sendNotification: boolean }) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/notices`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: 'Bearer temp-token', // 임시 토큰
                        },
                        body: JSON.stringify(data),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message || errorData.message || `등록에 실패했습니다. (${response.status})`
                        );
                    }

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.error?.message || '공지사항 등록에 실패했습니다.');
                    }

                    set({ loading: false });

                    const message = result.data.notification_sent
                        ? '공지사항이 성공적으로 등록되었고 알림톡이 발송되었습니다.'
                        : '공지사항이 성공적으로 등록되었습니다.';

                    return {
                        success: true,
                        id: result.data.id,
                        message,
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '공지사항 등록에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            updateAnnouncement: async (slug: string, id: string, data: AnnouncementUpdateData) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/notices/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: 'Bearer temp-token', // 임시 토큰
                        },
                        body: JSON.stringify(data),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message || errorData.message || `수정에 실패했습니다. (${response.status})`
                        );
                    }

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.error?.message || '공지사항 수정에 실패했습니다.');
                    }

                    set({ loading: false });

                    return {
                        success: true,
                        message: '공지사항이 성공적으로 수정되었습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '공지사항 수정에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            deleteAnnouncement: async (slug: string, id: string) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/notices/${id}`, {
                        method: 'DELETE',
                        headers: {
                            Authorization: 'Bearer temp-token', // 임시 토큰
                        },
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message || errorData.message || `삭제에 실패했습니다. (${response.status})`
                        );
                    }

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.error?.message || '공지사항 삭제에 실패했습니다.');
                    }

                    set({ loading: false });

                    return {
                        success: true,
                        message: '공지사항이 성공적으로 삭제되었습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '공지사항 삭제에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            fetchMetadata: async (slug: string) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/meta`);

                    if (!response.ok) {
                        throw new Error(`메타데이터를 불러올 수 없습니다. (${response.status})`);
                    }

                    const data = await response.json();
                    if (!data.success) {
                        throw new Error(data.message || '메타데이터 로딩 실패');
                    }

                    // 공지사항 서브카테고리만 필터링
                    const noticeSubcategories =
                        data.data?.subcategories?.filter((sub: any) => sub.category_key === 'notice') || [];

                    set({
                        subcategories: noticeSubcategories,
                        loading: false,
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '메타데이터를 불러올 수 없습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },
        }),
        {
            name: 'announcement-store',
        }
    )
);
