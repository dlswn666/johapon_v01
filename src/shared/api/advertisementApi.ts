import type { AdPlacement } from '@/entities/advertisement/model/types';

// 테넌트용 광고 노출 API
export const advertisementApi = {
    // 배너 광고 조회 (사이드/홈 배너용)
    async fetchBannerAds(
        slug: string,
        placement: 'SIDE' | 'HOME',
        device: 'DESKTOP' | 'MOBILE'
    ): Promise<{
        items: Array<{
            id: string;
            title: string;
            partner_name: string;
            phone: string;
            thumbnail_url: string | null;
            detail_image_url: string;
            placement: AdPlacement;
            device?: 'DESKTOP' | 'MOBILE';
        }>;
        total: number;
        placement: AdPlacement;
        device: 'DESKTOP' | 'MOBILE';
    }> {
        const response = await fetch(`/api/tenant/${slug}/ads?placement=${placement}&device=${device}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `배너 광고 조회 실패 (${response.status})`
            );
        }

        const responseData = await response.json();
        if (!responseData.success) {
            throw new Error(responseData.error?.message || '배너 광고 조회에 실패했습니다.');
        }

        return responseData.data;
    },

    // 광고 게시판 조회 (모든 광고 열람)
    async fetchBoardAds(
        slug: string,
        params: {
            page?: number;
            pageSize?: number;
            search?: string;
        } = {}
    ): Promise<{
        items: Array<{
            id: string;
            title: string;
            partner_name: string;
            phone: string;
            thumbnail_url: string | null;
            detail_image_url: string;
            created_at: string;
            placements: AdPlacement[];
        }>;
        total: number;
        hasMore: boolean;
        page: number;
        pageSize: number;
    }> {
        const queryParams = new URLSearchParams({
            page: String(params.page || 1),
            pageSize: String(params.pageSize || 12),
        });

        if (params.search) {
            queryParams.set('search', params.search);
        }

        const response = await fetch(`/api/tenant/${slug}/ads/board?${queryParams}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `광고 게시판 조회 실패 (${response.status})`
            );
        }

        const responseData = await response.json();
        if (!responseData.success) {
            throw new Error(responseData.error?.message || '광고 게시판 조회에 실패했습니다.');
        }

        return responseData.data;
    },
};
