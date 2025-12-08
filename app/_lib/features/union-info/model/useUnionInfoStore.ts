'use client';

import { create } from 'zustand';
import { UnionInfo, UnionInfoWithFiles } from '@/app/_lib/shared/type/database.types';

interface UnionInfoFilter {
    keyword: string;
    author: string;
    page: number;
    pageSize: number;
}

interface UnionInfoStore {
    // 목록 상태
    posts: UnionInfo[];
    totalCount: number;
    filters: UnionInfoFilter;

    // 상세/선택 상태
    selectedPost: UnionInfoWithFiles | null;

    // 에디터 이미지 관리
    editorImages: Record<string, File>;

    // 임시 업로드 파일 관리
    tempFiles: { path: string; name: string; size: number; type: string }[];

    // 액션 - 목록
    setPosts: (posts: UnionInfo[]) => void;
    setTotalCount: (count: number) => void;
    setFilters: (filters: Partial<UnionInfoFilter>) => void;
    resetFilters: () => void;

    // 액션 - 상세
    setSelectedPost: (post: UnionInfoWithFiles | null) => void;

    // 액션 - CRUD 반영
    addPost: (post: UnionInfo) => void;
    updatePost: (id: number, post: Partial<UnionInfo>) => void;
    removePost: (id: number) => void;
    incrementViews: (id: number) => void;

    // 액션 - 에디터 이미지
    addEditorImage: (blobUrl: string, file: File) => void;
    removeEditorImage: (blobUrl: string) => void;
    clearEditorImages: () => void;

    // 액션 - 임시 파일
    setTempFiles: (files: { path: string; name: string; size: number; type: string }[]) => void;
    addTempFile: (file: { path: string; name: string; size: number; type: string }) => void;
    removeTempFile: (path: string) => void;
    clearTempFiles: () => void;

    // 전체 리셋
    reset: () => void;
}

const initialFilters: UnionInfoFilter = {
    keyword: '',
    author: '',
    page: 1,
    pageSize: 10,
};

const initialState = {
    posts: [],
    totalCount: 0,
    filters: initialFilters,
    selectedPost: null,
    editorImages: {},
    tempFiles: [],
};

const useUnionInfoStore = create<UnionInfoStore>((set) => ({
    ...initialState,

    // 목록
    setPosts: (posts) => set({ posts }),
    setTotalCount: (totalCount) => set({ totalCount }),
    setFilters: (newFilters) =>
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
        })),
    resetFilters: () => set({ filters: initialFilters }),

    // 상세
    setSelectedPost: (post) => set({ selectedPost: post }),

    // CRUD
    addPost: (post) =>
        set((state) => ({
            posts: [post, ...state.posts],
            totalCount: state.totalCount + 1,
        })),

    updatePost: (id, updatedPost) =>
        set((state) => ({
            posts: state.posts.map((post) => (post.id === id ? { ...post, ...updatedPost } : post)),
            selectedPost:
                state.selectedPost?.id === id ? { ...state.selectedPost, ...updatedPost } : state.selectedPost,
        })),

    removePost: (id) =>
        set((state) => ({
            posts: state.posts.filter((post) => post.id !== id),
            totalCount: state.totalCount - 1,
            selectedPost: state.selectedPost?.id === id ? null : state.selectedPost,
        })),

    incrementViews: (id) =>
        set((state) => ({
            posts: state.posts.map((post) => (post.id === id ? { ...post, views: post.views + 1 } : post)),
            selectedPost:
                state.selectedPost?.id === id
                    ? { ...state.selectedPost, views: state.selectedPost.views + 1 }
                    : state.selectedPost,
        })),

    // 에디터 이미지
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

    // 임시 파일
    setTempFiles: (files) => set({ tempFiles: files }),

    addTempFile: (file) =>
        set((state) => ({
            tempFiles: [...state.tempFiles, file],
        })),

    removeTempFile: (path) =>
        set((state) => ({
            tempFiles: state.tempFiles.filter((f) => f.path !== path),
        })),

    clearTempFiles: () => set({ tempFiles: [] }),

    // 전체 리셋
    reset: () => set(initialState),
}));

export default useUnionInfoStore;

