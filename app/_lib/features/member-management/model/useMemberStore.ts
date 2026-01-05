import { create } from 'zustand';
import { User } from '@/app/_lib/shared/type/database.types';

// 차단 상태 필터 타입
export type BlockedFilter = 'all' | 'normal' | 'blocked';

// 검색 필터 타입
export interface MemberSearchFilter {
    searchQuery: string;           // 이름 또는 물건지 주소 검색
    blockedFilter: BlockedFilter;  // 차단 상태 필터
}

interface MemberStore {
    // 상태
    members: User[];
    selectedMember: User | null;
    filter: MemberSearchFilter;
    page: number;
    pageSize: number;
    totalCount: number;
    
    // 상태 변경 함수
    setMembers: (members: User[]) => void;
    setSelectedMember: (member: User | null) => void;
    setFilter: (filter: Partial<MemberSearchFilter>) => void;
    setPage: (page: number) => void;
    setTotalCount: (count: number) => void;
    
    // 리셋
    reset: () => void;
    resetFilter: () => void;
}

const initialFilter: MemberSearchFilter = {
    searchQuery: '',
    blockedFilter: 'all',
};

const initialState = {
    members: [] as User[],
    selectedMember: null as User | null,
    filter: initialFilter,
    page: 1,
    pageSize: 10,
    totalCount: 0,
};

const useMemberStore = create<MemberStore>((set) => ({
    ...initialState,
    
    setMembers: (members: User[]) => set({ members }),
    
    setSelectedMember: (member: User | null) => set({ selectedMember: member }),
    
    setFilter: (newFilter: Partial<MemberSearchFilter>) =>
        set((state) => ({
            filter: { ...state.filter, ...newFilter },
            page: 1, // 필터 변경 시 첫 페이지로 이동
        })),
    
    setPage: (page: number) => set({ page }),
    
    setTotalCount: (totalCount: number) => set({ totalCount }),
    
    reset: () => set(initialState),
    
    resetFilter: () => set({ filter: initialFilter, page: 1 }),
}));

export default useMemberStore;
