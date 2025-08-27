import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { announcementApi } from '@/shared/api/announcementApi';
import type {
    AnnouncementItem,
    AnnouncementDetail,
    AnnouncementCreateData,
    AnnouncementUpdateData,
    CategoryOption,
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
                    const result = await announcementApi.fetchAnnouncements({
                        slug,
                        page: currentPage,
                        pageSize,
                        categoryKey: filters.categoryKey,
                        subcategoryId: filters.subcategoryId,
                        searchTerm: filters.searchTerm,
                        popupOnly: filters.popupOnly,
                    });

                    set((state) => ({
                        announcements: reset ? result.items : [...state.announcements, ...result.items],
                        total: result.total,
                        hasMore: result.hasMore,
                        page: currentPage + 1,
                        loading: false,
                    }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            fetchAnnouncementDetail: async (slug: string, id: string) => {
                set({ loading: true, error: null });

                try {
                    const announcement = await announcementApi.fetchAnnouncementDetail(slug, id);
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
                    const result = await announcementApi.createAnnouncement(slug, data);
                    set({ loading: false });

                    const message = result.notificationSent
                        ? '공지사항이 성공적으로 등록되었고 알림톡이 발송되었습니다.'
                        : '공지사항이 성공적으로 등록되었습니다.';

                    return {
                        success: true,
                        id: result.id,
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
                    const result = await announcementApi.updateAnnouncement(slug, id, data);
                    set({ loading: false });
                    return result;
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
                    const result = await announcementApi.deleteAnnouncement(slug, id);
                    set({ loading: false });
                    return result;
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
                    const { categories, subcategories } = await announcementApi.fetchMetadata(slug);
                    
                    set({
                        categories,
                        subcategories,
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
