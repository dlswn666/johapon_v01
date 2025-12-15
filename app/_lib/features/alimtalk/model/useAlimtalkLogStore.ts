import { create } from 'zustand';
import { AlimtalkLog, AlimtalkLogWithUnion } from '@/app/_lib/shared/type/database.types';

interface AlimtalkLogStore {
    // 상태
    logs: AlimtalkLogWithUnion[];
    selectedLog: AlimtalkLogWithUnion | null;
    isLoading: boolean;
    
    // 통계
    stats: {
        totalCount: number;
        kakaoSuccessCount: number;
        smsSuccessCount: number;
        failCount: number;
        totalCost: number;
    };

    // 필터
    filters: {
        unionId: string | null;
        channelFilter: 'all' | 'default' | 'custom';
        dateFrom: string | null;
        dateTo: string | null;
        searchTerm: string;
    };

    // 액션
    setLogs: (logs: AlimtalkLogWithUnion[]) => void;
    addLog: (log: AlimtalkLogWithUnion) => void;
    setSelectedLog: (log: AlimtalkLogWithUnion | null) => void;
    setIsLoading: (isLoading: boolean) => void;
    setStats: (stats: AlimtalkLogStore['stats']) => void;
    setFilters: (filters: Partial<AlimtalkLogStore['filters']>) => void;
    resetFilters: () => void;
    reset: () => void;
}

const initialFilters = {
    unionId: null,
    channelFilter: 'all' as const,
    dateFrom: null,
    dateTo: null,
    searchTerm: '',
};

const initialStats = {
    totalCount: 0,
    kakaoSuccessCount: 0,
    smsSuccessCount: 0,
    failCount: 0,
    totalCost: 0,
};

const initialState = {
    logs: [],
    selectedLog: null,
    isLoading: false,
    stats: initialStats,
    filters: initialFilters,
};

const useAlimtalkLogStore = create<AlimtalkLogStore>((set) => ({
    ...initialState,

    setLogs: (logs) => {
        // 로그 설정 시 통계도 함께 계산
        const stats = logs.reduce(
            (acc, log) => ({
                totalCount: acc.totalCount + log.recipient_count,
                kakaoSuccessCount: acc.kakaoSuccessCount + (log.kakao_success_count || 0),
                smsSuccessCount: acc.smsSuccessCount + (log.sms_success_count || 0),
                failCount: acc.failCount + log.fail_count,
                totalCost: acc.totalCost + (log.estimated_cost || 0),
            }),
            initialStats
        );
        set({ logs, stats });
    },

    addLog: (log) =>
        set((state) => ({
            logs: [log, ...state.logs],
            stats: {
                totalCount: state.stats.totalCount + log.recipient_count,
                kakaoSuccessCount: state.stats.kakaoSuccessCount + (log.kakao_success_count || 0),
                smsSuccessCount: state.stats.smsSuccessCount + (log.sms_success_count || 0),
                failCount: state.stats.failCount + log.fail_count,
                totalCost: state.stats.totalCost + (log.estimated_cost || 0),
            },
        })),

    setSelectedLog: (selectedLog) => set({ selectedLog }),
    
    setIsLoading: (isLoading) => set({ isLoading }),
    
    setStats: (stats) => set({ stats }),

    setFilters: (filters) =>
        set((state) => ({
            filters: { ...state.filters, ...filters },
        })),

    resetFilters: () => set({ filters: initialFilters }),

    reset: () => set(initialState),
}));

export default useAlimtalkLogStore;

