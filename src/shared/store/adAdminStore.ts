import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { advertisementAdminApi } from '@/shared/api/admin/advertisementAdminApi';
import type {
    Ad,
    AdCreateData,
    AdUpdateData,
    AdListItem,
    FetchAdsParams,
    AdContract,
    AdContractCreateData,
    AdContractUpdateData,
    FetchContractsParams,
    AdInvoice,
    AdInvoiceUpdateData,
    FetchInvoicesParams,
    AdDashboardSummary,
    AdPlacement,
    ContractStatus,
    InvoiceStatus,
} from '@/entities/advertisement/model/types';

// 관리자 탭 상태
type AdminTab = 'dashboard' | 'ads' | 'contracts' | 'invoices';

interface AdAdminState {
    // ========== 공통 상태 ==========
    loading: boolean;
    error: string | null;
    currentTab: AdminTab;
    selectedUnionId: string | null; // 'all', 'common', 또는 특정 조합 ID

    // ========== 광고 관리 ==========
    ads: AdListItem[];
    currentAd: Ad | null;
    adsTotal: number;
    adsHasMore: boolean;
    adsPage: number;
    adsPageSize: number;
    adsFilters: {
        placement?: AdPlacement;
        active?: boolean;
        search?: string;
    };

    // ========== 계약 관리 ==========
    contracts: AdContract[];
    currentContract: AdContract | null;
    contractsTotal: number;
    contractsHasMore: boolean;
    contractsPage: number;
    contractsPageSize: number;
    contractsFilters: {
        status?: ContractStatus;
        adId?: string;
    };

    // ========== 청구서 관리 ==========
    invoices: AdInvoice[];
    currentInvoice: AdInvoice | null;
    invoicesTotal: number;
    invoicesHasMore: boolean;
    invoicesPage: number;
    invoicesPageSize: number;
    invoicesFilters: {
        status?: InvoiceStatus;
        month?: string; // YYYY-MM
    };

    // ========== 대시보드 ==========
    dashboardData: AdDashboardSummary | null;

    // ========== 기본 액션 ==========
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setCurrentTab: (tab: AdminTab) => void;
    setSelectedUnionId: (unionId: string | null) => void;
    resetState: () => void;

    // ========== 광고 관리 액션 ==========
    setAds: (ads: AdListItem[]) => void;
    addAds: (ads: AdListItem[]) => void;
    setCurrentAd: (ad: Ad | null) => void;
    setAdsTotal: (total: number) => void;
    setAdsHasMore: (hasMore: boolean) => void;
    setAdsPage: (page: number) => void;
    setAdsFilters: (filters: Partial<AdAdminState['adsFilters']>) => void;
    resetAdsState: () => void;

    // ========== 계약 관리 액션 ==========
    setContracts: (contracts: AdContract[]) => void;
    addContracts: (contracts: AdContract[]) => void;
    setCurrentContract: (contract: AdContract | null) => void;
    setContractsTotal: (total: number) => void;
    setContractsHasMore: (hasMore: boolean) => void;
    setContractsPage: (page: number) => void;
    setContractsFilters: (filters: Partial<AdAdminState['contractsFilters']>) => void;
    resetContractsState: () => void;

    // ========== 청구서 관리 액션 ==========
    setInvoices: (invoices: AdInvoice[]) => void;
    addInvoices: (invoices: AdInvoice[]) => void;
    setCurrentInvoice: (invoice: AdInvoice | null) => void;
    setInvoicesTotal: (total: number) => void;
    setInvoicesHasMore: (hasMore: boolean) => void;
    setInvoicesPage: (page: number) => void;
    setInvoicesFilters: (filters: Partial<AdAdminState['invoicesFilters']>) => void;
    resetInvoicesState: () => void;

    // ========== 대시보드 액션 ==========
    setDashboardData: (data: AdDashboardSummary | null) => void;

    // ========== API 호출 액션 ==========
    // 광고 API
    fetchAds: (reset?: boolean) => Promise<void>;
    fetchAdDetail: (id: string) => Promise<void>;
    createAd: (data: AdCreateData) => Promise<{ success: boolean; id?: string; message: string }>;
    updateAd: (id: string, data: AdUpdateData) => Promise<{ success: boolean; message: string }>;
    deleteAd: (id: string) => Promise<{ success: boolean; message: string }>;

    // 계약 API
    fetchContracts: (reset?: boolean) => Promise<void>;
    fetchContractDetail: (id: string) => Promise<void>;
    createContract: (data: AdContractCreateData) => Promise<{ success: boolean; id?: string; message: string }>;
    updateContract: (id: string, data: AdContractUpdateData) => Promise<{ success: boolean; message: string }>;
    deleteContract: (id: string) => Promise<{ success: boolean; message: string }>;

    // 청구서 API
    fetchInvoices: (reset?: boolean) => Promise<void>;
    fetchInvoiceDetail: (id: string) => Promise<void>;
    updateInvoice: (id: string, data: AdInvoiceUpdateData) => Promise<{ success: boolean; message: string }>;
    generateInvoices: (month: string) => Promise<{ success: boolean; message: string; generated_count: number }>;

    // 대시보드 API
    fetchDashboard: () => Promise<void>;
}

export const useAdAdminStore = create<AdAdminState>()(
    devtools(
        (set, get) => ({
            // ========== 초기 상태 ==========
            loading: false,
            error: null,
            currentTab: 'dashboard',
            selectedUnionId: 'all',

            // 광고 관리
            ads: [],
            currentAd: null,
            adsTotal: 0,
            adsHasMore: false,
            adsPage: 1,
            adsPageSize: 10,
            adsFilters: {},

            // 계약 관리
            contracts: [],
            currentContract: null,
            contractsTotal: 0,
            contractsHasMore: false,
            contractsPage: 1,
            contractsPageSize: 10,
            contractsFilters: {},

            // 청구서 관리
            invoices: [],
            currentInvoice: null,
            invoicesTotal: 0,
            invoicesHasMore: false,
            invoicesPage: 1,
            invoicesPageSize: 10,
            invoicesFilters: {},

            // 대시보드
            dashboardData: null,

            // ========== 기본 액션 ==========
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),
            setCurrentTab: (tab) => set({ currentTab: tab }),
            setSelectedUnionId: (unionId) => set({ selectedUnionId: unionId }),
            resetState: () =>
                set({
                    loading: false,
                    error: null,
                    ads: [],
                    currentAd: null,
                    contracts: [],
                    currentContract: null,
                    invoices: [],
                    currentInvoice: null,
                    dashboardData: null,
                }),

            // ========== 광고 관리 액션 ==========
            setAds: (ads) => set({ ads }),
            addAds: (newAds) =>
                set((state) => ({
                    ads: [...state.ads, ...newAds],
                })),
            setCurrentAd: (ad) => set({ currentAd: ad }),
            setAdsTotal: (total) => set({ adsTotal: total }),
            setAdsHasMore: (hasMore) => set({ adsHasMore: hasMore }),
            setAdsPage: (page) => set({ adsPage: page }),
            setAdsFilters: (filters) =>
                set((state) => ({
                    adsFilters: { ...state.adsFilters, ...filters },
                })),
            resetAdsState: () =>
                set({
                    ads: [],
                    currentAd: null,
                    adsTotal: 0,
                    adsHasMore: false,
                    adsPage: 1,
                    adsFilters: {},
                }),

            // ========== 계약 관리 액션 ==========
            setContracts: (contracts) => set({ contracts }),
            addContracts: (newContracts) =>
                set((state) => ({
                    contracts: [...state.contracts, ...newContracts],
                })),
            setCurrentContract: (contract) => set({ currentContract: contract }),
            setContractsTotal: (total) => set({ contractsTotal: total }),
            setContractsHasMore: (hasMore) => set({ contractsHasMore: hasMore }),
            setContractsPage: (page) => set({ contractsPage: page }),
            setContractsFilters: (filters) =>
                set((state) => ({
                    contractsFilters: { ...state.contractsFilters, ...filters },
                })),
            resetContractsState: () =>
                set({
                    contracts: [],
                    currentContract: null,
                    contractsTotal: 0,
                    contractsHasMore: false,
                    contractsPage: 1,
                    contractsFilters: {},
                }),

            // ========== 청구서 관리 액션 ==========
            setInvoices: (invoices) => set({ invoices }),
            addInvoices: (newInvoices) =>
                set((state) => ({
                    invoices: [...state.invoices, ...newInvoices],
                })),
            setCurrentInvoice: (invoice) => set({ currentInvoice: invoice }),
            setInvoicesTotal: (total) => set({ invoicesTotal: total }),
            setInvoicesHasMore: (hasMore) => set({ invoicesHasMore: hasMore }),
            setInvoicesPage: (page) => set({ invoicesPage: page }),
            setInvoicesFilters: (filters) =>
                set((state) => ({
                    invoicesFilters: { ...state.invoicesFilters, ...filters },
                })),
            resetInvoicesState: () =>
                set({
                    invoices: [],
                    currentInvoice: null,
                    invoicesTotal: 0,
                    invoicesHasMore: false,
                    invoicesPage: 1,
                    invoicesFilters: {},
                }),

            // ========== 대시보드 액션 ==========
            setDashboardData: (data) => set({ dashboardData: data }),

            // ========== API 호출 액션 ==========

            // 광고 API
            fetchAds: async (reset = false) => {
                const { adsPage, adsPageSize, adsFilters, selectedUnionId } = get();
                const currentPage = reset ? 1 : adsPage;

                set({ loading: true, error: null });

                try {
                    const params: FetchAdsParams = {
                        page: currentPage,
                        pageSize: adsPageSize,
                        unionId: selectedUnionId === 'all' ? undefined : selectedUnionId,
                        ...adsFilters,
                    };

                    const result = await advertisementAdminApi.fetchAds(params);

                    set((state) => ({
                        ads: reset ? result.items : [...state.ads, ...result.items],
                        adsTotal: result.total,
                        adsHasMore: result.hasMore,
                        adsPage: currentPage + 1,
                        loading: false,
                    }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '광고 목록 조회에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            fetchAdDetail: async (id: string) => {
                set({ loading: true, error: null });

                try {
                    const ad = await advertisementAdminApi.fetchAdDetail(id);
                    set({ currentAd: ad, loading: false });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '광고 상세 조회에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            createAd: async (data: AdCreateData) => {
                set({ loading: true, error: null });

                try {
                    const result = await advertisementAdminApi.createAd(data);
                    set({ loading: false });
                    return result;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '광고 생성에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            updateAd: async (id: string, data: AdUpdateData) => {
                set({ loading: true, error: null });

                try {
                    const result = await advertisementAdminApi.updateAd(id, data);
                    set({ loading: false });
                    return result;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '광고 수정에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            deleteAd: async (id: string) => {
                set({ loading: true, error: null });

                try {
                    const result = await advertisementAdminApi.deleteAd(id);
                    set({ loading: false });
                    return result;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '광고 삭제에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            // 계약 API
            fetchContracts: async (reset = false) => {
                const { contractsPage, contractsPageSize, contractsFilters, selectedUnionId } = get();
                const currentPage = reset ? 1 : contractsPage;

                set({ loading: true, error: null });

                try {
                    const params: FetchContractsParams = {
                        page: currentPage,
                        pageSize: contractsPageSize,
                        unionId: selectedUnionId === 'all' ? undefined : selectedUnionId,
                        ...contractsFilters,
                    };

                    const result = await advertisementAdminApi.fetchContracts(params);

                    set((state) => ({
                        contracts: reset ? result.items : [...state.contracts, ...result.items],
                        contractsTotal: result.total,
                        contractsHasMore: result.hasMore,
                        contractsPage: currentPage + 1,
                        loading: false,
                    }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '계약 목록 조회에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            fetchContractDetail: async (id: string) => {
                set({ loading: true, error: null });

                try {
                    const contract = await advertisementAdminApi.fetchContractDetail(id);
                    set({ currentContract: contract, loading: false });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '계약 상세 조회에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            createContract: async (data: AdContractCreateData) => {
                set({ loading: true, error: null });

                try {
                    const result = await advertisementAdminApi.createContract(data);
                    set({ loading: false });
                    return result;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '계약 생성에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            updateContract: async (id: string, data: AdContractUpdateData) => {
                set({ loading: true, error: null });

                try {
                    const result = await advertisementAdminApi.updateContract(id, data);
                    set({ loading: false });
                    return result;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '계약 수정에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            deleteContract: async (id: string) => {
                set({ loading: true, error: null });

                try {
                    const result = await advertisementAdminApi.deleteContract(id);
                    set({ loading: false });
                    return result;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '계약 삭제에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            // 청구서 API
            fetchInvoices: async (reset = false) => {
                const { invoicesPage, invoicesPageSize, invoicesFilters, selectedUnionId } = get();
                const currentPage = reset ? 1 : invoicesPage;

                set({ loading: true, error: null });

                try {
                    const params: FetchInvoicesParams = {
                        page: currentPage,
                        pageSize: invoicesPageSize,
                        unionId: selectedUnionId === 'all' ? undefined : selectedUnionId,
                        ...invoicesFilters,
                    };

                    const result = await advertisementAdminApi.fetchInvoices(params);

                    set((state) => ({
                        invoices: reset ? result.items : [...state.invoices, ...result.items],
                        invoicesTotal: result.total,
                        invoicesHasMore: result.hasMore,
                        invoicesPage: currentPage + 1,
                        loading: false,
                    }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '청구서 목록 조회에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            fetchInvoiceDetail: async (id: string) => {
                set({ loading: true, error: null });

                try {
                    const invoice = await advertisementAdminApi.fetchInvoiceDetail(id);
                    set({ currentInvoice: invoice, loading: false });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '청구서 상세 조회에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            updateInvoice: async (id: string, data: AdInvoiceUpdateData) => {
                set({ loading: true, error: null });

                try {
                    const result = await advertisementAdminApi.updateInvoice(id, data);
                    set({ loading: false });
                    return result;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '청구서 수정에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            generateInvoices: async (month: string) => {
                set({ loading: true, error: null });

                try {
                    const result = await advertisementAdminApi.generateInvoices(month);
                    set({ loading: false });
                    return result;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '청구서 생성에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                        generated_count: 0,
                    };
                }
            },

            // 대시보드 API
            fetchDashboard: async () => {
                const { selectedUnionId } = get();
                set({ loading: true, error: null });

                try {
                    const unionId = selectedUnionId === 'all' || selectedUnionId === null ? undefined : selectedUnionId;
                    const data = await advertisementAdminApi.fetchDashboard(unionId);
                    set({ dashboardData: data, loading: false });
                } catch (error) {
                    const errorMessage =
                        error instanceof Error ? error.message : '대시보드 데이터 조회에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },
        }),
        {
            name: 'ad-admin-store',
        }
    )
);
