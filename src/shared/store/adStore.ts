import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { advertisementApi } from '@/shared/api/advertisementApi';
import type { AdPlacement } from '@/entities/advertisement/model/types';

// 광고 아이템 타입
interface AdItem {
    id: string;
    title: string;
    partner_name: string;
    phone: string;
    thumbnail_url: string | null;
    detail_image_url: string;
    placement: AdPlacement;
    device?: 'DESKTOP' | 'MOBILE';
}

// 테넌트용 광고 노출 Store
interface AdState {
    // ========== 배너 광고 상태 (디바이스별 캐시) ==========
    sideBannerAds: {
        desktop: AdItem[];
        mobile: AdItem[];
    };
    homeBannerAds: {
        desktop: AdItem[];
        mobile: AdItem[];
    };

    // ========== 광고 게시판 상태 ==========
    boardAds: AdItem[];
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
    setSideBannerAds: (device: 'DESKTOP' | 'MOBILE', ads: AdItem[]) => void;
    setHomeBannerAds: (device: 'DESKTOP' | 'MOBILE', ads: AdItem[]) => void;
    setBoardAds: (ads: AdItem[]) => void;
    addBoardAds: (ads: AdItem[]) => void;
    setBoardTotal: (total: number) => void;
    setBoardHasMore: (hasMore: boolean) => void;
    setBoardPage: (page: number) => void;
    setBoardSearch: (search: string) => void;
    resetBoardState: () => void;

    // ========== API 호출 액션 ==========
    fetchSideBannerAds: (slug: string, device: 'DESKTOP' | 'MOBILE') => Promise<void>;
    fetchHomeBannerAds: (slug: string, device: 'DESKTOP' | 'MOBILE') => Promise<void>;
    fetchBoardAds: (slug: string, reset?: boolean) => Promise<void>;
}

export const useAdStore = create<AdState>()(
    devtools(
        (set, get) => ({
            // ========== 초기 상태 ==========
            sideBannerAds: {
                desktop: [],
                mobile: [],
            },
            homeBannerAds: {
                desktop: [],
                mobile: [],
            },
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
            setSideBannerAds: (device, ads) =>
                set((state) => ({
                    sideBannerAds: {
                        ...state.sideBannerAds,
                        [device.toLowerCase()]: ads,
                    },
                })),
            setHomeBannerAds: (device, ads) =>
                set((state) => ({
                    homeBannerAds: {
                        ...state.homeBannerAds,
                        [device.toLowerCase()]: ads,
                    },
                })),
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
            fetchSideBannerAds: async (slug: string, device: 'DESKTOP' | 'MOBILE') => {
                set({ loading: true, error: null });

                try {
                    const result = await advertisementApi.fetchBannerAds(slug, 'SIDE', device);
                    console.log('[AD_STORE] fetchSideBannerAds result:', result);
                    get().setSideBannerAds(device, result.items);
                    set({ loading: false });
                } catch (error) {
                    const errorMessage =
                        error instanceof Error ? error.message : '사이드 배너 광고 조회에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            fetchHomeBannerAds: async (slug: string, device: 'DESKTOP' | 'MOBILE') => {
                set({ loading: true, error: null });

                try {
                    const result = await advertisementApi.fetchBannerAds(slug, 'HOME', device);
                    get().setHomeBannerAds(device, result.items);
                    set({ loading: false });
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
