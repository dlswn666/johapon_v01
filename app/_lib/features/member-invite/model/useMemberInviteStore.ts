import { create } from 'zustand';
import { MemberInvite } from '@/app/_lib/shared/type/database.types';

export type MemberInviteFilter = 'all' | 'pending' | 'used';

interface MemberInviteStore {
    // 상태
    memberInvites: MemberInvite[];
    filter: MemberInviteFilter;
    selectedIds: string[];
    
    // 상태 변경 함수
    setMemberInvites: (invites: MemberInvite[]) => void;
    addMemberInvite: (invite: MemberInvite) => void;
    addMemberInvites: (invites: MemberInvite[]) => void;
    updateMemberInvite: (id: string, invite: Partial<MemberInvite>) => void;
    removeMemberInvite: (id: string) => void;
    
    // 필터
    setFilter: (filter: MemberInviteFilter) => void;
    
    // 선택
    toggleSelect: (id: string) => void;
    selectAll: (ids: string[]) => void;
    clearSelection: () => void;
    
    // 필터링된 결과
    getFilteredInvites: () => MemberInvite[];
    
    // 리셋
    reset: () => void;
}

const initialState = {
    memberInvites: [] as MemberInvite[],
    filter: 'all' as MemberInviteFilter,
    selectedIds: [] as string[],
};

const useMemberInviteStore = create<MemberInviteStore>((set, get) => ({
    ...initialState,
    
    setMemberInvites: (invites: MemberInvite[]) => set({ memberInvites: invites }),
    
    addMemberInvite: (invite: MemberInvite) =>
        set((state) => ({
            memberInvites: [...state.memberInvites, invite],
        })),
    
    addMemberInvites: (invites: MemberInvite[]) =>
        set((state) => ({
            memberInvites: [...state.memberInvites, ...invites],
        })),
    
    updateMemberInvite: (id: string, updatedInvite: Partial<MemberInvite>) =>
        set((state) => ({
            memberInvites: state.memberInvites.map((invite) =>
                invite.id === id ? { ...invite, ...updatedInvite } : invite
            ),
        })),
    
    removeMemberInvite: (id: string) =>
        set((state) => ({
            memberInvites: state.memberInvites.filter((invite) => invite.id !== id),
            selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
        })),
    
    setFilter: (filter: MemberInviteFilter) => set({ filter }),
    
    toggleSelect: (id: string) =>
        set((state) => {
            const isSelected = state.selectedIds.includes(id);
            return {
                selectedIds: isSelected
                    ? state.selectedIds.filter((selectedId) => selectedId !== id)
                    : [...state.selectedIds, id],
            };
        }),
    
    selectAll: (ids: string[]) => set({ selectedIds: ids }),
    
    clearSelection: () => set({ selectedIds: [] }),
    
    getFilteredInvites: () => {
        const { memberInvites, filter } = get();
        switch (filter) {
            case 'pending':
                return memberInvites.filter((invite) => invite.status === 'PENDING');
            case 'used':
                return memberInvites.filter((invite) => invite.status === 'USED');
            default:
                return memberInvites;
        }
    },
    
    reset: () => set(initialState),
}));

export default useMemberInviteStore;

