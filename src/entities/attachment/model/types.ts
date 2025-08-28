/**
 * 첨부파일 관련 타입 정의
 */

export interface Attachment {
    id: string;
    union_id: string;
    target_table: string;
    target_id: string;
    file_url: string;
    file_name: string;
    file_type: string;
    file_size?: number;
    uploaded_at: string;
    created_at?: string;
    updated_at?: string;
}

export interface FileUploadRequest {
    slug: string;
    target_table: string;
    target_id: string;
    file: File;
}

export interface FileUploadResponse {
    attachment_id: string;
    file_url: string;
    file_name: string;
    file_type: string;
}

export interface FileListResponse {
    items: Attachment[];
}

export interface FileDeleteRequest {
    slug: string;
    fileId: string;
}

export interface UploadProgress {
    fileId: string;
    fileName: string;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
    error?: string;
}

export interface FileValidationRule {
    maxSize?: number; // bytes
    allowedTypes?: string[]; // MIME types
    maxFiles?: number;
}

export const DEFAULT_FILE_VALIDATION: FileValidationRule = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxFiles: 5,
};

export const IMAGE_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const DOCUMENT_FILE_TYPES = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
