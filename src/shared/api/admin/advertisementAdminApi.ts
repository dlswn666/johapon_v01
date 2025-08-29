import type {
    Ad,
    AdCreateData,
    AdUpdateData,
    AdListItem,
    FetchAdsParams,
    FetchAdsResponse,
    AdContract,
    AdContractCreateData,
    AdContractUpdateData,
    FetchContractsParams,
    FetchContractsResponse,
    AdInvoice,
    AdInvoiceUpdateData,
    FetchInvoicesParams,
    FetchInvoicesResponse,
    AdDashboardSummary,
} from '@/entities/advertisement/model/types';

// 관리자용 광고 API
export const advertisementAdminApi = {
    // ========== 광고 관리 ==========

    // 광고 목록 조회
    async fetchAds(params: FetchAdsParams): Promise<FetchAdsResponse> {
        const queryParams = new URLSearchParams({
            page: String(params.page || 1),
            pageSize: String(params.pageSize || 10),
        });

        if (params.unionId !== undefined) {
            queryParams.set('unionId', params.unionId || 'common');
        }
        if (params.placement) {
            queryParams.set('placement', params.placement);
        }
        if (params.active !== undefined) {
            queryParams.set('active', String(params.active));
        }
        if (params.search) {
            queryParams.set('search', params.search);
        }

        const response = await fetch(`/api/admin/ads?${queryParams}`, {
            headers: {
                Authorization: 'Bearer temp-token', // 임시 토큰
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `광고 목록 조회 실패 (${response.status})`
            );
        }

        const responseData = await response.json();
        if (!responseData.success) {
            throw new Error(responseData.error?.message || '광고 목록 조회에 실패했습니다.');
        }

        return responseData.data;
    },

    // 광고 상세 조회
    async fetchAdDetail(id: string): Promise<Ad> {
        const response = await fetch(`/api/admin/ads/${id}`, {
            headers: {
                Authorization: 'Bearer temp-token',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `광고 상세 조회 실패 (${response.status})`
            );
        }

        const responseData = await response.json();
        if (!responseData.success) {
            throw new Error(responseData.error?.message || '광고 상세 조회에 실패했습니다.');
        }

        return responseData.data;
    },

    // 광고 생성
    async createAd(data: AdCreateData): Promise<{ success: boolean; id?: string; message: string }> {
        const response = await fetch('/api/admin/ads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer temp-token',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || errorData.message || `광고 생성 실패 (${response.status})`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '광고 생성에 실패했습니다.');
        }

        return {
            success: true,
            id: result.data.id,
            message: result.data.message,
        };
    },

    // 광고 수정
    async updateAd(id: string, data: AdUpdateData): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`/api/admin/ads/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer temp-token',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || errorData.message || `광고 수정 실패 (${response.status})`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '광고 수정에 실패했습니다.');
        }

        return {
            success: true,
            message: result.data.message,
        };
    },

    // 광고 삭제
    async deleteAd(id: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`/api/admin/ads/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: 'Bearer temp-token',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || errorData.message || `광고 삭제 실패 (${response.status})`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '광고 삭제에 실패했습니다.');
        }

        return {
            success: true,
            message: result.data.message,
        };
    },

    // ========== 계약 관리 ==========

    // 계약 목록 조회
    async fetchContracts(params: FetchContractsParams): Promise<FetchContractsResponse> {
        const queryParams = new URLSearchParams({
            page: String(params.page || 1),
            pageSize: String(params.pageSize || 10),
        });

        if (params.unionId !== undefined) {
            queryParams.set('unionId', params.unionId || 'common');
        }
        if (params.status) {
            queryParams.set('status', params.status);
        }
        if (params.adId) {
            queryParams.set('adId', params.adId);
        }

        const response = await fetch(`/api/admin/ad-contracts?${queryParams}`, {
            headers: {
                Authorization: 'Bearer temp-token',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `계약 목록 조회 실패 (${response.status})`
            );
        }

        const responseData = await response.json();
        if (!responseData.success) {
            throw new Error(responseData.error?.message || '계약 목록 조회에 실패했습니다.');
        }

        return responseData.data;
    },

    // 계약 상세 조회
    async fetchContractDetail(id: string): Promise<AdContract> {
        const response = await fetch(`/api/admin/ad-contracts/${id}`, {
            headers: {
                Authorization: 'Bearer temp-token',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `계약 상세 조회 실패 (${response.status})`
            );
        }

        const responseData = await response.json();
        if (!responseData.success) {
            throw new Error(responseData.error?.message || '계약 상세 조회에 실패했습니다.');
        }

        return responseData.data;
    },

    // 계약 생성
    async createContract(data: AdContractCreateData): Promise<{ success: boolean; id?: string; message: string }> {
        const response = await fetch('/api/admin/ad-contracts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer temp-token',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || errorData.message || `계약 생성 실패 (${response.status})`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '계약 생성에 실패했습니다.');
        }

        return {
            success: true,
            id: result.data.id,
            message: result.data.message,
        };
    },

    // 계약 수정
    async updateContract(id: string, data: AdContractUpdateData): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`/api/admin/ad-contracts/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer temp-token',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || errorData.message || `계약 수정 실패 (${response.status})`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '계약 수정에 실패했습니다.');
        }

        return {
            success: true,
            message: result.data.message,
        };
    },

    // 계약 삭제
    async deleteContract(id: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`/api/admin/ad-contracts/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: 'Bearer temp-token',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || errorData.message || `계약 삭제 실패 (${response.status})`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '계약 삭제에 실패했습니다.');
        }

        return {
            success: true,
            message: result.data.message,
        };
    },

    // ========== 청구서 관리 ==========

    // 청구서 목록 조회
    async fetchInvoices(params: FetchInvoicesParams): Promise<FetchInvoicesResponse> {
        const queryParams = new URLSearchParams({
            page: String(params.page || 1),
            pageSize: String(params.pageSize || 10),
        });

        if (params.unionId !== undefined) {
            queryParams.set('unionId', params.unionId || 'common');
        }
        if (params.status) {
            queryParams.set('status', params.status);
        }
        if (params.month) {
            queryParams.set('month', params.month);
        }

        const response = await fetch(`/api/admin/ad-invoices?${queryParams}`, {
            headers: {
                Authorization: 'Bearer temp-token',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `청구서 목록 조회 실패 (${response.status})`
            );
        }

        const responseData = await response.json();
        if (!responseData.success) {
            throw new Error(responseData.error?.message || '청구서 목록 조회에 실패했습니다.');
        }

        return responseData.data;
    },

    // 청구서 상세 조회
    async fetchInvoiceDetail(id: string): Promise<AdInvoice> {
        const response = await fetch(`/api/admin/ad-invoices/${id}`, {
            headers: {
                Authorization: 'Bearer temp-token',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `청구서 상세 조회 실패 (${response.status})`
            );
        }

        const responseData = await response.json();
        if (!responseData.success) {
            throw new Error(responseData.error?.message || '청구서 상세 조회에 실패했습니다.');
        }

        return responseData.data;
    },

    // 청구서 수정 (입금 처리)
    async updateInvoice(id: string, data: AdInvoiceUpdateData): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`/api/admin/ad-invoices/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer temp-token',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || errorData.message || `청구서 수정 실패 (${response.status})`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '청구서 수정에 실패했습니다.');
        }

        return {
            success: true,
            message: result.data.message,
        };
    },

    // 자동 청구서 생성
    async generateInvoices(month: string): Promise<{ success: boolean; message: string; generated_count: number }> {
        const response = await fetch(`/api/admin/ad-invoices/generate?month=${month}`, {
            method: 'POST',
            headers: {
                Authorization: 'Bearer temp-token',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || errorData.message || `청구서 생성 실패 (${response.status})`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '청구서 생성에 실패했습니다.');
        }

        return {
            success: true,
            message: result.data.message,
            generated_count: result.data.generated_count,
        };
    },

    // ========== 대시보드 ==========

    // 대시보드 데이터 조회
    async fetchDashboard(unionId?: string): Promise<AdDashboardSummary> {
        const queryParams = new URLSearchParams();
        if (unionId) {
            queryParams.set('unionId', unionId);
        }

        const response = await fetch(`/api/admin/ads-dashboard?${queryParams}`, {
            headers: {
                Authorization: 'Bearer temp-token',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `대시보드 데이터 조회 실패 (${response.status})`
            );
        }

        const responseData = await response.json();
        if (!responseData.success) {
            throw new Error(responseData.error?.message || '대시보드 데이터 조회에 실패했습니다.');
        }

        return responseData.data;
    },
};
