/**
 * 첨부파일 관련 API 서비스
 * claude.md 규칙에 따라 axios 인스턴스 사용 및 에러 처리 표준화
 */

import {
    Attachment,
    FileUploadRequest,
    FileUploadResponse,
    FileListResponse,
    FileDeleteRequest,
    UploadProgress,
} from '@/entities/attachment/model/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export class AttachmentService {
    /**
     * 파일 업로드 (첨부파일로 DB 저장)
     */
    static async uploadFile(
        request: FileUploadRequest,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<FileUploadResponse> {
        const formData = new FormData();
        formData.append('slug', request.slug);
        formData.append('target_table', request.target_table);
        formData.append('target_id', request.target_id);
        formData.append('file', request.file);

        const tempFileId = `temp-${Date.now()}`;

        try {
            // 업로드 시작 알림
            onProgress?.({
                fileId: tempFileId,
                fileName: request.file.name,
                progress: 0,
                status: 'uploading',
            });

            const response = await fetch('/api/attachments', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Upload failed');
            }

            const result = await response.json();

            // 업로드 완료 알림 (같은 tempFileId 사용)
            onProgress?.({
                fileId: tempFileId,
                fileName: request.file.name,
                progress: 100,
                status: 'completed',
            });

            return {
                attachment_id: result.attachment_id,
                file_url: result.file_url,
                file_name: request.file.name,
                file_type: request.file.type,
            };
        } catch (error) {
            // 에러 알림
            onProgress?.({
                fileId: tempFileId,
                fileName: request.file.name,
                progress: 0,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
            });
            throw error;
        }
    }

    /**
     * 에디터용 이미지 업로드 (단순 파일 업로드, DB 저장 없음)
     */
    static async uploadEditorImage(
        slug: string,
        targetTable: string,
        targetId: string,
        file: File
    ): Promise<{ file_url: string }> {
        const formData = new FormData();
        formData.append('slug', slug);
        formData.append('target_table', targetTable);
        formData.append('target_id', targetId);
        formData.append('file', file);

        const response = await fetch('/api/uploads', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Image upload failed');
        }

        const result = await response.json();

        // Supabase Storage URL 생성
        const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || `https://${projectId}.supabase.co`;
        const fullUrl = `${baseUrl}/storage/v1/object/public/post-upload/${result.file_url}`;

        return { file_url: fullUrl };
    }

    /**
     * 파일 목록 조회
     */
    static async getFileList(slug: string, targetTable: string, targetId: string): Promise<Attachment[]> {
        const url = `/api/tenant/${encodeURIComponent(slug)}/files?target_table=${encodeURIComponent(
            targetTable
        )}&target_id=${encodeURIComponent(targetId)}`;

        const response = await fetch(url, {
            method: 'GET',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch files');
        }

        const result = await response.json();
        return result.success ? result.data.items : [];
    }

    /**
     * 파일 삭제
     */
    static async deleteFile(request: FileDeleteRequest): Promise<void> {
        const url = `/api/tenant/${encodeURIComponent(request.slug)}/files/${encodeURIComponent(request.fileId)}`;

        const response = await fetch(url, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to delete file');
        }
    }

    /**
     * 파일 다운로드 URL 생성
     */
    static getDownloadUrl(fileUrl: string): string {
        // 이미 full URL인 경우
        if (fileUrl.startsWith('http')) {
            return fileUrl;
        }

        // Supabase Storage URL 생성
        // bucket이 public이 아닌 경우 signed URL을 사용해야 하지만,
        // 현재는 public URL 형태로 생성
        const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || `https://${projectId}.supabase.co`;
        return `${baseUrl}/storage/v1/object/public/post-upload/${fileUrl}`;
    }

    /**
     * 파일 유효성 검사
     */
    static validateFile(file: File, maxSize: number = 10 * 1024 * 1024, allowedTypes?: string[]): string | null {
        if (file.size > maxSize) {
            return `파일 크기가 너무 큽니다. 최대 ${Math.round(maxSize / 1024 / 1024)}MB까지 업로드 가능합니다.`;
        }

        if (allowedTypes && !allowedTypes.includes(file.type)) {
            return `지원하지 않는 파일 형식입니다. 허용된 형식: ${allowedTypes.join(', ')}`;
        }

        return null;
    }

    /**
     * 파일 크기를 읽기 쉬운 형식으로 변환
     */
    static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
