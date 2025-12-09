'use client';

import { create } from 'zustand';
import { FreeBoard } from '@/app/_lib/shared/type/database.types';

interface FreeBoardStore {
    freeBoards: FreeBoard[];
    selectedFreeBoard: FreeBoard | null;
    editorImages: Record<string, File>; // blobUrl -> File 매핑
    
    // 페이지네이션 상태
    totalCount: number;
    currentPage: number;
    pageSize: number;

    setFreeBoards: (freeBoards: FreeBoard[]) => void;
    setSelectedFreeBoard: (freeBoard: FreeBoard | null) => void;
    addFreeBoard: (freeBoard: FreeBoard) => void;
    updateFreeBoard: (id: number, freeBoard: Partial<FreeBoard>) => void;
    removeFreeBoard: (id: number) => void;
    incrementViews: (id: number) => void;
    
    // 페이지네이션 액션
    setTotalCount: (count: number) => void;
    setCurrentPage: (page: number) => void;
    setPageSize: (size: number) => void;
    
    // 에디터 이미지 관리
    addEditorImage: (blobUrl: string, file: File) => void;
    removeEditorImage: (blobUrl: string) => void;
    clearEditorImages: () => void;

    reset: () => void;
}

const initialState = {
    freeBoards: [],
    selectedFreeBoard: null,
    editorImages: {},
    totalCount: 0,
    currentPage: 1,
    pageSize: 10,
};

const useFreeBoardStore = create<FreeBoardStore>((set) => ({
    ...initialState,

    setFreeBoards: (freeBoards) => set({ freeBoards }),

    setSelectedFreeBoard: (freeBoard) => set({ selectedFreeBoard: freeBoard }),

    addFreeBoard: (freeBoard) =>
        set((state) => ({
            freeBoards: [freeBoard, ...state.freeBoards],
            totalCount: state.totalCount + 1,
        })),

    updateFreeBoard: (id, updatedFreeBoard) =>
        set((state) => ({
            freeBoards: state.freeBoards.map((freeBoard) => 
                (freeBoard.id === id ? { ...freeBoard, ...updatedFreeBoard } : freeBoard)
            ),
            selectedFreeBoard: state.selectedFreeBoard?.id === id 
                ? { ...state.selectedFreeBoard, ...updatedFreeBoard } 
                : state.selectedFreeBoard,
        })),

    removeFreeBoard: (id) =>
        set((state) => ({
            freeBoards: state.freeBoards.filter((freeBoard) => freeBoard.id !== id),
            selectedFreeBoard: state.selectedFreeBoard?.id === id ? null : state.selectedFreeBoard,
            totalCount: Math.max(0, state.totalCount - 1),
        })),

    incrementViews: (id) =>
        set((state) => ({
            freeBoards: state.freeBoards.map((freeBoard) => 
                (freeBoard.id === id ? { ...freeBoard, views: freeBoard.views + 1 } : freeBoard)
            ),
            selectedFreeBoard: state.selectedFreeBoard?.id === id 
                ? { ...state.selectedFreeBoard, views: state.selectedFreeBoard.views + 1 } 
                : state.selectedFreeBoard,
        })),

    setTotalCount: (count) => set({ totalCount: count }),
    setCurrentPage: (page) => set({ currentPage: page }),
    setPageSize: (size) => set({ pageSize: size }),

    addEditorImage: (blobUrl, file) =>
        set((state) => ({
            editorImages: { ...state.editorImages, [blobUrl]: file },
        })),

    removeEditorImage: (blobUrl) =>
        set((state) => {
            const newImages = { ...state.editorImages };
            delete newImages[blobUrl];
            return { editorImages: newImages };
        }),

    clearEditorImages: () => set({ editorImages: {} }),

    reset: () => set(initialState),
}));

export default useFreeBoardStore;


