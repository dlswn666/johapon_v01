import { supabase } from '@/app/_lib/shared/supabase/client';
import { Database } from '@/app/_lib/shared/type/database.types';

export type FileRecord = Database['public']['Tables']['files']['Row'];
export type NewFileRecord = Database['public']['Tables']['files']['Insert'];

const BUCKET_NAME = 'files';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * 파일 확장자 추출
 */
const getFileExtension = (filename: string): string => {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot + 1).toLowerCase();
};

/**
 * 안전한 Storage용 파일명 생성
 * 형식: {timestamp}_{randomNumber}.{extension}
 * 한글 등 특수문자 문제를 피하기 위해 영문/숫자만 사용
 */
const generateSafeFileName = (originalFileName: string): string => {
    const extension = getFileExtension(originalFileName);
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 100000);
    return extension ? `${timestamp}_${randomNum}.${extension}` : `${timestamp}_${randomNum}`;
};

/**
 * File API
 *
 * 파일 업로드, 조회, 삭제 기능을 제공합니다.
 * Supabase Storage와 Database를 모두 다룹니다.
 */

export const fileApi = {
    /**
     * 임시 파일 업로드
     *
     * files 버킷의 temp/{tempId}/{safeFileName} 경로에 업로드합니다.
     * 한글 파일명 인코딩 문제를 피하기 위해 Storage에는 안전한 파일명 사용,
     * 원본 파일명은 name 필드로 반환하여 DB에 저장됩니다.
     */
    uploadTempFile: async (
        file: File,
        tempId: string
    ): Promise<{ path: string; name: string; size: number; type: string; storageName: string }> => {
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('파일 크기가 50MB를 초과합니다. 더 작은 파일을 선택해주세요.');
        }

        // 안전한 파일명 생성 (영문/숫자만 사용)
        const safeFileName = generateSafeFileName(file.name);

        // 임시 경로 생성: temp/{tempId}/{safeFileName}
        const path = `temp/${tempId}/${safeFileName}`;

        const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
            cacheControl: '3600',
            upsert: true,
        });

        if (error) {
            throw new Error(`Temp upload failed: ${error.message}`);
        }

        return {
            path: data.path, // storage path (안전한 파일명 사용)
            name: file.name, // 원본 파일명 (한글 포함)
            size: file.size,
            type: file.type,
            storageName: safeFileName, // Storage에 저장된 파일명
        };
    },

    /**
     * 파일 확정 (임시 -> 영구 이동 및 DB 저장)
     *
     * Storage의 temp 경로에 있는 파일을 실제 경로(unions/...)로 이동하고 DB에 기록합니다.
     * Storage에는 안전한 파일명(영문/숫자)을 사용하고, DB에는 원본 파일명(한글 포함)을 저장합니다.
     */
    confirmFiles: async ({
        files,
        targetId, // noticeId or unionId or unionInfoId or freeBoardId
        targetType, // 'NOTICE' | 'UNION' | 'UNION_INFO' | 'FREE_BOARD'
        unionSlug,
        uploaderId,
    }: {
        files: { path: string; name: string; size: number; type: string }[];
        targetId: string;
        targetType: 'NOTICE' | 'UNION' | 'UNION_INFO' | 'FREE_BOARD';
        unionSlug: string;
        uploaderId?: string;
    }): Promise<void> => {
        for (const file of files) {
            // 1. Storage Move
            // 원본 경로에서 파일명 추출 (이미 안전한 파일명 사용 중)
            const currentFileName = file.path.split('/').pop() || generateSafeFileName(file.name);

            // Destination Path: unions/{unionSlug}/notices/{noticeId}/{currentFileName}
            // or unions/{unionSlug}/union_info/{unionInfoId}/{currentFileName}
            // or unions/{unionSlug}/free-boards/{freeBoardId}/{currentFileName}
            // or unions/{unionSlug}/files/{currentFileName} (General files)
            let destPath = '';
            if (targetType === 'NOTICE') {
                destPath = `unions/${unionSlug}/notices/${targetId}/${currentFileName}`;
            } else if (targetType === 'UNION_INFO') {
                destPath = `unions/${unionSlug}/union_info/${targetId}/${currentFileName}`;
            } else if (targetType === 'FREE_BOARD') {
                destPath = `unions/${unionSlug}/free-boards/${targetId}/${currentFileName}`;
            } else {
                destPath = `unions/${unionSlug}/files/${currentFileName}`;
            }

            const { error: moveError } = await supabase.storage.from(BUCKET_NAME).move(file.path, destPath);

            if (moveError) {
                console.error(`File move failed: ${file.name}`, moveError);
                // 이동 실패 시 건너뛰거나 에러 처리 (여기서는 로그 남기고 계속 진행)
                continue;
            }

            // 2. DB Insert - 원본 파일명(한글 포함)을 name에 저장
            // attachable_type 매핑: NOTICE -> notice, UNION_INFO -> union_info, UNION -> union
            const attachableType = targetType.toLowerCase().replace('_', '_');
            const newFile: NewFileRecord = {
                name: file.name, // 원본 파일명 (한글 포함)
                path: destPath, // Storage 경로 (안전한 파일명 사용)
                size: file.size,
                type: file.type,
                bucket_id: BUCKET_NAME,
                uploader_id: uploaderId || null,
                union_id: null,
                attachable_type: attachableType,
                attachable_id: Number(targetId),
            };

            const { error: dbError } = await supabase.from('files').insert(newFile);

            if (dbError) {
                console.error(`DB insert failed: ${file.name}`, dbError);
                // 롤백 로직 (파일 삭제 등) 필요할 수 있음
            }
        }
    },

    /**
     * 에디터 이미지 업로드 (DB 저장 X)
     * unions/{slug}/notices/{noticeId}/{safeFileName} 경로에 업로드
     */
    uploadImage: async (
        file: File,
        unionSlug: string,
        noticeId: string
    ): Promise<{ path: string; publicUrl: string }> => {
        const safeFileName = generateSafeFileName(file.name);
        const path = `unions/${unionSlug}/notices/${noticeId}/${safeFileName}`;

        const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
            cacheControl: '3600',
            upsert: true,
        });

        if (error) {
            throw new Error(`Image upload failed: ${error.message}`);
        }

        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

        return {
            path: data.path,
            publicUrl: publicUrlData.publicUrl,
        };
    },

    /**
     * 폴더(경로) 하위 모든 파일 삭제
     * 예: unions/{slug}/notices/{noticeId}/
     */
    deleteFolder: async (folderPath: string): Promise<void> => {
        // 1. List files in folder
        const { data: list, error: listError } = await supabase.storage.from(BUCKET_NAME).list(folderPath);

        if (listError) {
            console.warn(`Folder list failed (might be empty): ${folderPath}`, listError);
            return;
        }

        if (!list || list.length === 0) return;

        // 2. Remove files
        const filesToRemove = list.map((x) => `${folderPath}/${x.name}`);
        const { error: removeError } = await supabase.storage.from(BUCKET_NAME).remove(filesToRemove);

        if (removeError) {
            throw new Error(`Folder delete failed: ${removeError.message}`);
        }
    },

    /**
     * 파일 삭제
     */
    deleteFile: async (fileId: string, filePath: string): Promise<void> => {
        // 1. Remove from Storage
        const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

        if (storageError) {
            throw new Error(`Storage delete failed: ${storageError.message}`);
        }

        // 2. Remove from Database
        const { error: dbError } = await supabase.from('files').delete().eq('id', fileId);

        if (dbError) {
            throw new Error(`Database delete failed: ${dbError.message}`);
        }
    },

    /**
     * 파일 목록 조회 (다형성 연관 관계)
     * attachableType: 'notice' | 'union_info' | 'union' 등
     * attachableId: 게시판 ID
     */
    getFiles: async ({ attachableType, attachableId }: { attachableType?: string; attachableId?: string | number }): Promise<FileRecord[]> => {
        let query = supabase.from('files').select('*').order('created_at', { ascending: false });

        if (attachableType && attachableId) {
            query = query.eq('attachable_type', attachableType).eq('attachable_id', Number(attachableId));
        } else {
            return [];
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Fetch files failed: ${error.message}`);
        }

        return data;
    },

    // 기존 호환성 유지 (unionId 기준) - deprecated
    getFilesByUnion: async (unionId: string): Promise<FileRecord[]> => {
        return fileApi.getFiles({ attachableType: 'union', attachableId: unionId });
    },

    /**
     * 파일 업로드 (Direct - 구버전 호환용)
     */
    uploadFile: async ({
        file,
        unionSlug,
        unionId,
        uploaderId,
    }: {
        file: File;
        unionSlug: string;
        unionId: string;
        uploaderId?: string;
    }): Promise<FileRecord> => {
        const path = `${unionSlug}/${file.name}`;
        const { error: storageError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(path, file, { cacheControl: '3600', upsert: true });

        if (storageError) throw new Error(`Storage upload failed: ${storageError.message}`);

        const newFile: NewFileRecord = {
            name: file.name,
            path: path,
            size: file.size,
            type: file.type,
            bucket_id: BUCKET_NAME,
            union_id: unionId,
            uploader_id: uploaderId || null,
        };

        const { data, error: dbError } = await supabase.from('files').insert(newFile).select().single();

        if (dbError) throw new Error(`Database insert failed: ${dbError.message}`);
        return data;
    },

    /**
     * 다운로드 URL 생성
     * @param path - Storage 경로
     * @param originalFileName - 다운로드 시 사용할 원본 파일명 (한글 포함 가능)
     */
    getDownloadUrl: async (path: string, originalFileName?: string): Promise<string> => {
        const options: { download?: string | boolean } = {};

        // 원본 파일명이 제공되면 다운로드 시 해당 파일명 사용
        if (originalFileName) {
            options.download = originalFileName;
        }

        const { data } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, 60 * 60, options);

        if (!data?.signedUrl) {
            throw new Error('Failed to create signed URL');
        }
        return data.signedUrl;
    },
};
