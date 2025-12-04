import { create } from 'zustand';
import { Union } from '@/app/_lib/shared/type/database.types';

// Union 타입 확장 (is_active 포함)
export interface UnionWithActive extends Union {
    is_active: boolean;
}

interface UnionManagementStore {
    // 상태
    unions: UnionWithActive[];
    selectedUnion: UnionWithActive | null;
    isLoading: boolean;
    error: Error | null;

    // 통계
    totalCount: number;
    activeCount: number;
    inactiveCount: number;

    // 필터
    searchKeyword: string;
    filterStatus: 'all' | 'active' | 'inactive';

    // Actions
    setUnions: (unions: UnionWithActive[]) => void;
    setSelectedUnion: (union: UnionWithActive | null) => void;
    addUnion: (union: UnionWithActive) => void;
    updateUnion: (id: string, union: Partial<UnionWithActive>) => void;
    removeUnion: (id: string) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: Error | null) => void;
    setSearchKeyword: (keyword: string) => void;
    setFilterStatus: (status: 'all' | 'active' | 'inactive') => void;
    reset: () => void;
}

const initialState = {
    unions: [],
    selectedUnion: null,
    isLoading: false,
    error: null,
    totalCount: 0,
    activeCount: 0,
    inactiveCount: 0,
    searchKeyword: '',
    filterStatus: 'all' as const,
};

export const useUnionManagementStore = create<UnionManagementStore>((set) => ({
    ...initialState,

    setUnions: (unions) => {
        const activeCount = unions.filter((u) => u.is_active).length;
        const inactiveCount = unions.filter((u) => !u.is_active).length;
        set({
            unions,
            totalCount: unions.length,
            activeCount,
            inactiveCount,
        });
    },

    setSelectedUnion: (union) => set({ selectedUnion: union }),

    addUnion: (union) =>
        set((state) => {
            const newUnions = [...state.unions, union];
            const activeCount = newUnions.filter((u) => u.is_active).length;
            const inactiveCount = newUnions.filter((u) => !u.is_active).length;
            return {
                unions: newUnions,
                totalCount: newUnions.length,
                activeCount,
                inactiveCount,
            };
        }),

    updateUnion: (id, updatedUnion) =>
        set((state) => {
            const newUnions = state.unions.map((union) => (union.id === id ? { ...union, ...updatedUnion } : union));
            const activeCount = newUnions.filter((u) => u.is_active).length;
            const inactiveCount = newUnions.filter((u) => !u.is_active).length;
            return {
                unions: newUnions,
                totalCount: newUnions.length,
                activeCount,
                inactiveCount,
                selectedUnion:
                    state.selectedUnion?.id === id ? { ...state.selectedUnion, ...updatedUnion } : state.selectedUnion,
            };
        }),

    removeUnion: (id) =>
        set((state) => {
            const newUnions = state.unions.filter((union) => union.id !== id);
            const activeCount = newUnions.filter((u) => u.is_active).length;
            const inactiveCount = newUnions.filter((u) => !u.is_active).length;
            return {
                unions: newUnions,
                totalCount: newUnions.length,
                activeCount,
                inactiveCount,
                selectedUnion: state.selectedUnion?.id === id ? null : state.selectedUnion,
            };
        }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

    setFilterStatus: (status) => set({ filterStatus: status }),

    reset: () => set(initialState),
}));
