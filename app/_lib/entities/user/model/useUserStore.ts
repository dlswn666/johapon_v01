import { create } from 'zustand';
import { User, UserStatus, UserRole } from '@/app/_lib/shared/type/database.types';

interface UserStore {
    // 상태
    users: User[];
    currentUser: User | null;
    selectedUser: User | null;

    // 필터
    statusFilter: UserStatus | 'ALL';
    roleFilter: UserRole | 'ALL';
    searchQuery: string;

    // 액션 - 사용자 목록
    setUsers: (users: User[]) => void;
    addUser: (user: User) => void;
    updateUser: (id: string, user: Partial<User>) => void;
    removeUser: (id: string) => void;

    // 액션 - 현재/선택 사용자
    setCurrentUser: (user: User | null) => void;
    setSelectedUser: (user: User | null) => void;

    // 액션 - 필터
    setStatusFilter: (status: UserStatus | 'ALL') => void;
    setRoleFilter: (role: UserRole | 'ALL') => void;
    setSearchQuery: (query: string) => void;

    // 초기화
    reset: () => void;
}

const initialState = {
    users: [],
    currentUser: null,
    selectedUser: null,
    statusFilter: 'ALL' as const,
    roleFilter: 'ALL' as const,
    searchQuery: '',
};

const useUserStore = create<UserStore>((set) => ({
    ...initialState,

    // 사용자 목록 관리
    setUsers: (users) => set({ users }),
    addUser: (user) =>
        set((state) => ({
            users: [user, ...state.users],
        })),
    updateUser: (id, updatedUser) =>
        set((state) => ({
            users: state.users.map((user) =>
                user.id === id ? { ...user, ...updatedUser } : user
            ),
            // 현재 사용자도 업데이트
            currentUser:
                state.currentUser?.id === id
                    ? { ...state.currentUser, ...updatedUser }
                    : state.currentUser,
            // 선택된 사용자도 업데이트
            selectedUser:
                state.selectedUser?.id === id
                    ? { ...state.selectedUser, ...updatedUser }
                    : state.selectedUser,
        })),
    removeUser: (id) =>
        set((state) => ({
            users: state.users.filter((user) => user.id !== id),
            selectedUser: state.selectedUser?.id === id ? null : state.selectedUser,
        })),

    // 현재/선택 사용자
    setCurrentUser: (user) => set({ currentUser: user }),
    setSelectedUser: (user) => set({ selectedUser: user }),

    // 필터
    setStatusFilter: (status) => set({ statusFilter: status }),
    setRoleFilter: (role) => set({ roleFilter: role }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    // 초기화
    reset: () => set(initialState),
}));

export default useUserStore;




