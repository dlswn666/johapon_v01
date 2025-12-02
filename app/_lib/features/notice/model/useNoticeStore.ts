'use client';

import { create } from 'zustand';
import { Notice } from '@/app/_lib/shared/type/database.types';

interface NoticeStore {
    notices: Notice[];
    selectedNotice: Notice | null;
    setNotices: (notices: Notice[]) => void;
    setSelectedNotice: (notice: Notice | null) => void;
    addNotice: (notice: Notice) => void;
    updateNotice: (id: number, notice: Partial<Notice>) => void;
    removeNotice: (id: number) => void;
    incrementViews: (id: number) => void;
    reset: () => void;
}

const initialState = {
    notices: [],
    selectedNotice: null,
};

const useNoticeStore = create<NoticeStore>((set) => ({
    ...initialState,

    setNotices: (notices) => set({ notices }),

    setSelectedNotice: (notice) => set({ selectedNotice: notice }),

    addNotice: (notice) =>
        set((state) => ({
            notices: [notice, ...state.notices],
        })),

    updateNotice: (id, updatedNotice) =>
        set((state) => ({
            notices: state.notices.map((notice) => (notice.id === id ? { ...notice, ...updatedNotice } : notice)),
            selectedNotice: state.selectedNotice?.id === id ? { ...state.selectedNotice, ...updatedNotice } : state.selectedNotice,
        })),

    removeNotice: (id) =>
        set((state) => ({
            notices: state.notices.filter((notice) => notice.id !== id),
            selectedNotice: state.selectedNotice?.id === id ? null : state.selectedNotice,
        })),

    incrementViews: (id) =>
        set((state) => ({
            notices: state.notices.map((notice) => (notice.id === id ? { ...notice, views: notice.views + 1 } : notice)),
            selectedNotice: state.selectedNotice?.id === id ? { ...state.selectedNotice, views: state.selectedNotice.views + 1 } : state.selectedNotice,
        })),

    reset: () => set(initialState),
}));

export default useNoticeStore;

