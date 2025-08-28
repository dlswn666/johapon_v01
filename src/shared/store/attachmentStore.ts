/**
 * 첨부파일 관리 Zustand Store
 * claude.md 규칙에 따라 feature slice로 분리하여 모듈화
 */

'use client';

import { create } from 'zustand';
import { Attachment, UploadProgress, FileUploadRequest, FileDeleteRequest } from '@/entities/attachment/model/types';
import { AttachmentService } from '@/shared/api/attachmentApi';

interface AttachmentState {
    // 상태
    attachments: Record<string, Attachment[]>; // key: `${targetTable}-${targetId}`
    uploads: Record<string, UploadProgress>; // key: fileId
    loading: boolean;
    error: string | null;

    // 액션
    uploadFile: (request: FileUploadRequest) => Promise<string>; // returns attachment_id
    uploadEditorImage: (slug: string, targetTable: string, targetId: string, file: File) => Promise<string>; // returns file_url
    loadAttachments: (slug: string, targetTable: string, targetId: string) => Promise<void>;
    deleteFile: (request: FileDeleteRequest, targetTable: string, targetId: string) => Promise<void>;
    clearUploads: () => void;
    removeUploadProgress: (fileId: string) => void;
    clearError: () => void;

    // 유틸리티
    getAttachments: (targetTable: string, targetId: string) => Attachment[];
    getUploadProgress: (fileId: string) => UploadProgress | null;
    isUploading: () => boolean;
    cleanupCompletedUploads: () => void;
}

export const useAttachmentStore = create<AttachmentState>((set, get) => ({
    // 초기 상태
    attachments: {},
    uploads: {},
    loading: false,
    error: null,

    // 파일 업로드 (첨부파일로 저장)
    uploadFile: async (request: FileUploadRequest) => {
        const key = `${request.target_table}-${request.target_id}`;
        let tempFileId: string | null = null;

        try {
            set({ error: null });

            const result = await AttachmentService.uploadFile(request, (progress) => {
                // tempFileId 저장 (처음 한 번만)
                if (!tempFileId) {
                    tempFileId = progress.fileId;
                }

                set((state) => ({
                    uploads: {
                        ...state.uploads,
                        [progress.fileId]: progress,
                    },
                }));
            });

            // 업로드 완료 후 첨부파일 목록 새로고침
            await get().loadAttachments(request.slug, request.target_table, request.target_id);

            // 완료된 업로드 항목들 정리 (사용자가 상태를 확인할 수 있도록 약간의 지연)
            get().cleanupCompletedUploads();

            return result.attachment_id;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';
            set({ error: errorMessage });
            throw error;
        }
    },

    // 에디터용 이미지 업로드
    uploadEditorImage: async (slug: string, targetTable: string, targetId: string, file: File) => {
        try {
            set({ error: null });

            const result = await AttachmentService.uploadEditorImage(slug, targetTable, targetId, file);
            return result.file_url;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Image upload failed';
            set({ error: errorMessage });
            throw error;
        }
    },

    // 첨부파일 목록 로드
    loadAttachments: async (slug: string, targetTable: string, targetId: string) => {
        const key = `${targetTable}-${targetId}`;

        try {
            set({ loading: true, error: null });

            const attachments = await AttachmentService.getFileList(slug, targetTable, targetId);

            set((state) => ({
                attachments: {
                    ...state.attachments,
                    [key]: attachments,
                },
                loading: false,
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load attachments';
            set({ error: errorMessage, loading: false });
        }
    },

    // 파일 삭제
    deleteFile: async (request: FileDeleteRequest, targetTable: string, targetId: string) => {
        const key = `${targetTable}-${targetId}`;

        try {
            set({ error: null });

            await AttachmentService.deleteFile(request);

            // 로컬 상태에서 삭제된 파일 제거
            set((state) => ({
                attachments: {
                    ...state.attachments,
                    [key]: (state.attachments[key] || []).filter((attachment) => attachment.id !== request.fileId),
                },
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
            set({ error: errorMessage });
            throw error;
        }
    },

    // 업로드 진행상황 초기화
    clearUploads: () => {
        set({ uploads: {} });
    },

    // 특정 파일의 업로드 진행상황 제거
    removeUploadProgress: (fileId: string) => {
        set((state) => {
            const newUploads = { ...state.uploads };
            delete newUploads[fileId];
            return { uploads: newUploads };
        });
    },

    // 에러 초기화
    clearError: () => {
        set({ error: null });
    },

    // 유틸리티: 특정 타겟의 첨부파일 목록 가져오기
    getAttachments: (targetTable: string, targetId: string) => {
        const key = `${targetTable}-${targetId}`;
        return get().attachments[key] || [];
    },

    // 유틸리티: 특정 파일의 업로드 진행상황 가져오기
    getUploadProgress: (fileId: string) => {
        return get().uploads[fileId] || null;
    },

    // 유틸리티: 현재 업로드 중인지 확인
    isUploading: () => {
        const uploads = get().uploads;
        return Object.values(uploads).some((upload) => upload.status === 'uploading');
    },

    // 유틸리티: 완료된 업로드 항목들 정리
    cleanupCompletedUploads: () => {
        setTimeout(() => {
            set((state) => {
                const newUploads = { ...state.uploads };
                // 완료되거나 에러인 항목들을 2초 후 제거
                Object.keys(newUploads).forEach((fileId) => {
                    const upload = newUploads[fileId];
                    if (upload.status === 'completed' || upload.status === 'error') {
                        delete newUploads[fileId];
                    }
                });
                return { uploads: newUploads };
            });
        }, 2000); // 2초로 단축
    },
}));
