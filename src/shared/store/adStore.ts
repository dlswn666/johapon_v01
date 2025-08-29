import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { advertisementApi } from '@/shared/api/advertisementApi';
import type { AdPlacement } from '@/entities/advertisement/model/types';

// 테넌트용 광고 노출 Store
interface AdState {
    // ========== 배너 광고 상태 ==========
    sideBannerAds: Array<{
        id: string;
        title: string;
        partner_name: string;
        phone: string;
        thumbnail_url: string | null;
        detail_image_url: string;
        placement: AdPlacement;
    }>;
    homeBannerAds: Array<{
        id: string;
        title: string;
        partner_name: string;
        phone: string;
        thumbnail_url: string | null;
        detail_image_url: string;
        placement: AdPlacement;
    }>;

    // ========== 광고 게시판 상태 ==========
    boardAds: Array<{
        id: string;
        title: string;
        partner_name: string;
        phone: string;
        thumbnail_url: string | null;
        detail_image_url: string;
        created_at: string;
        placements: AdPlacement[];
    }>;
    boardTotal: number;
    boardHasMore: boolean;
    boardPage: number;
    boardPageSize: number;
    boardSearch: string;

    // ========== 공통 상태 ==========
    loading: boolean;
    error: string | null;

    // ========== 액션 ==========
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setSideBannerAds: (ads: AdState['sideBannerAds']) => void;
    setHomeBannerAds: (ads: AdState['homeBannerAds']) => void;
    setBoardAds: (ads: AdState['boardAds']) => void;
    addBoardAds: (ads: AdState['boardAds']) => void;
    setBoardTotal: (total: number) => void;
    setBoardHasMore: (hasMore: boolean) => void;
    setBoardPage: (page: number) => void;
    setBoardSearch: (search: string) => void;
    resetBoardState: () => void;

    // ========== API 호출 액션 ==========
    fetchSideBannerAds: (slug: string) => Promise<void>;
    fetchHomeBannerAds: (slug: string) => Promise<void>;
    fetchBoardAds: (slug: string, reset?: boolean) => Promise<void>;
}

export const useAdStore = create<AdState>()(
    devtools(
        (set, get) => ({
            // ========== 초기 상태 ==========
            sideBannerAds: [],
            homeBannerAds: [],
            boardAds: [],
            boardTotal: 0,
            boardHasMore: false,
            boardPage: 1,
            boardPageSize: 12,
            boardSearch: '',
            loading: false,
            error: null,

            // ========== 기본 액션 ==========
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),
            setSideBannerAds: (ads) => set({ sideBannerAds: ads }),
            setHomeBannerAds: (ads) => set({ homeBannerAds: ads }),
            setBoardAds: (ads) => set({ boardAds: ads }),
            addBoardAds: (newAds) =>
                set((state) => ({
                    boardAds: [...state.boardAds, ...newAds],
                })),
            setBoardTotal: (total) => set({ boardTotal: total }),
            setBoardHasMore: (hasMore) => set({ boardHasMore: hasMore }),
            setBoardPage: (page) => set({ boardPage: page }),
            setBoardSearch: (search) => set({ boardSearch: search }),
            resetBoardState: () =>
                set({
                    boardAds: [],
                    boardTotal: 0,
                    boardHasMore: false,
                    boardPage: 1,
                    boardSearch: '',
                }),

            // ========== API 호출 액션 ==========
            fetchSideBannerAds: async (slug: string) => {
                set({ loading: true, error: null });

                try {
                    const result = await advertisementApi.fetchBannerAds(slug, 'SIDE');
                    set({ sideBannerAds: result.items, loading: false });
                } catch (error) {
                    const errorMessage =
                        error instanceof Error ? error.message : '사이드 배너 광고 조회에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            fetchHomeBannerAds: async (slug: string) => {
                set({ loading: true, error: null });

                try {
                    const result = await advertisementApi.fetchBannerAds(slug, 'HOME');
                    set({ homeBannerAds: result.items, loading: false });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '홈 배너 광고 조회에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            fetchBoardAds: async (slug: string, reset = false) => {
                const { boardPage, boardPageSize, boardSearch } = get();
                const currentPage = reset ? 1 : boardPage;

                set({ loading: true, error: null });

                try {
                    const result = await advertisementApi.fetchBoardAds(slug, {
                        page: currentPage,
                        pageSize: boardPageSize,
                        search: boardSearch || undefined,
                    });

                    set((state) => ({
                        boardAds: reset ? result.items : [...state.boardAds, ...result.items],
                        boardTotal: result.total,
                        boardHasMore: result.hasMore,
                        boardPage: currentPage + 1,
                        loading: false,
                    }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '광고 게시판 조회에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },
        }),
        {
            name: 'ad-store',
        }
    )
);
