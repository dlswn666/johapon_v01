import { create } from 'zustand';
import { fileApi, FileRecord } from '@/app/_lib/shared/hooks/file/fileApi';
import { v4 as uuidv4 } from 'uuid';

interface TempFile {
    id: string; // 임시 식별용
    file: File;
    path: string; // temp storage path
    name: string;
    size: number;
    type: string;
    status: 'uploading' | 'completed' | 'error';
}

interface FileState {
    // 영구 저장된 파일 목록
    files: FileRecord[];

    // 임시 업로드된 파일 목록 (작성 중인 화면용)
    tempFiles: TempFile[];

    isLoading: boolean;
    isUploading: boolean;
    error: string | null;

    // Actions
    fetchFiles: (params: { unionId?: string; noticeId?: string }) => Promise<void>;

    // 구버전 호환 (삭제 예정)
    uploadFile: (params: { file: File; unionSlug: string; unionId: string; uploaderId?: string }) => Promise<void>;

    deleteFile: (fileId: string, filePath: string) => Promise<void>;
    getDownloadUrl: (path: string, originalFileName?: string) => Promise<string>;

    // New Actions
    uploadTempFile: (file: File) => Promise<void>;
    removeTempFile: (tempId: string) => void; // UI에서 취소 시
    confirmFiles: (params: {
        targetId: string;
        targetType: 'NOTICE' | 'UNION';
        unionSlug: string;
        uploaderId?: string;
        unionId?: string;
    }) => Promise<void>;
    clearTempFiles: () => void;
}

export const useFileStore = create<FileState>((set, get) => ({
    files: [],
    tempFiles: [],
    isLoading: false,
    isUploading: false,
    error: null,

    fetchFiles: async (params) => {
        set({ isLoading: true, error: null });
        try {
            const files = await fileApi.getFiles(params);
            set({ files, isLoading: false });
        } catch (error) {
            // Error handling with type assertion
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isLoading: false });
        }
    },

    // Legacy (Direct Upload)
    uploadFile: async (params) => {
        set({ isUploading: true, error: null });
        try {
            const newFile = await fileApi.uploadFile(params);
            set((state) => ({
                files: [newFile, ...state.files],
                isUploading: false,
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isUploading: false });
            throw error;
        }
    },

    deleteFile: async (fileId: string, filePath: string) => {
        try {
            await fileApi.deleteFile(fileId, filePath);
            set((state) => ({
                files: state.files.filter((f) => f.id !== fileId),
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    getDownloadUrl: async (path: string, originalFileName?: string) => {
        return await fileApi.getDownloadUrl(path, originalFileName);
    },

    // --- New Logic ---

    uploadTempFile: async (file: File) => {
        const tempId = uuidv4(); // Store 관리용 임시 ID
        // 1. UI에 즉시 추가 (Uploading 상태)
        const newTempFile: TempFile = {
            id: tempId,
            file,
            path: '',
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'uploading',
        };

        set((state) => ({
            tempFiles: [...state.tempFiles, newTempFile],
            isUploading: true,
        }));

        try {
            // 2. Storage Upload
            const result = await fileApi.uploadTempFile(file, tempId);

            set((state) => ({
                tempFiles: state.tempFiles.map((f) =>
                    f.id === tempId ? { ...f, path: result.path, status: 'completed' } : f
                ),
                isUploading: false,
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set((state) => ({
                tempFiles: state.tempFiles.map((f) => (f.id === tempId ? { ...f, status: 'error' } : f)),
                error: errorMessage,
                isUploading: false,
            }));
        }
    },

    removeTempFile: (tempId: string) => {
        set((state) => ({
            tempFiles: state.tempFiles.filter((f) => f.id !== tempId),
        }));
    },

    clearTempFiles: () => {
        set({ tempFiles: [] });
    },

    confirmFiles: async (params) => {
        const { tempFiles } = get();
        if (tempFiles.length === 0) return;

        const completedFiles = tempFiles.filter((f) => f.status === 'completed');
        if (completedFiles.length === 0) return;

        set({ isUploading: true });
        try {
            await fileApi.confirmFiles({
                files: completedFiles.map((f) => ({
                    path: f.path,
                    name: f.name,
                    size: f.size,
                    type: f.type,
                })),
                ...params,
            });
            set({ tempFiles: [], isUploading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, isUploading: false });
            throw error;
        }
    },
}));
