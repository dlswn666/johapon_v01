import { supabase } from '@/app/_lib/shared/supabase/client';
import { Database } from '@/app/_lib/shared/type/database.types';

export type FileRecord = Database['public']['Tables']['files']['Row'];
export type NewFileRecord = Database['public']['Tables']['files']['Insert'];

const BUCKET_NAME = 'files';

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
     * files 버킷의 temp/{tempId}/{fileName} 경로에 업로드합니다.
     * DB에는 저장하지 않습니다.
     */
    uploadTempFile: async (
        file: File,
        tempId: string
    ): Promise<{ path: string; name: string; size: number; type: string }> => {
        // 임시 경로 생성: temp/사용자식별가능ID(여기선 tempId)/파일명
        // 한글 파일명 등 특수문자 처리를 위해 encodeURI 사용 권장되나, supabase js가 처리해줌
        const path = `temp/${tempId}/${file.name}`;

        const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
            cacheControl: '3600',
            upsert: true,
        });

        if (error) {
            throw new Error(`Temp upload failed: ${error.message}`);
        }

        return {
            path: data.path, // storage path
            name: file.name,
            size: file.size,
            type: file.type,
        };
    },

    /**
     * 파일 확정 (임시 -> 영구 이동 및 DB 저장)
     *
     * Storage의 temp 경로에 있는 파일을 실제 경로(unions/...)로 이동하고 DB에 기록합니다.
     */
    confirmFiles: async ({
        files,
        targetId, // noticeId or unionId
        targetType, // 'NOTICE' | 'UNION'
        unionSlug,
        uploaderId,
    }: {
        files: { path: string; name: string; size: number; type: string }[];
        targetId: string;
        targetType: 'NOTICE' | 'UNION'; // 현재는 Notice 위주지만 확장성 고려
        unionSlug: string;
        uploaderId?: string;
    }): Promise<void> => {
        for (const file of files) {
            // 1. Storage Move
            // Destination Path: unions/{unionSlug}/notices/{noticeId}/{fileName}
            // or unions/{unionSlug}/files/{fileName} (General files)

            let destPath = '';
            if (targetType === 'NOTICE') {
                destPath = `unions/${unionSlug}/notices/${targetId}/${file.name}`;
            } else {
                destPath = `unions/${unionSlug}/files/${file.name}`;
            }

            const { error: moveError } = await supabase.storage.from(BUCKET_NAME).move(file.path, destPath);

            if (moveError) {
                console.error(`File move failed: ${file.name}`, moveError);
                // 이동 실패 시 건너뛰거나 에러 처리 (여기서는 로그 남기고 계속 진행)
                continue;
            }

            // 2. DB Insert
            const newFile: NewFileRecord = {
                name: file.name,
                path: destPath,
                size: file.size,
                type: file.type,
                bucket_id: BUCKET_NAME,
                uploader_id: uploaderId || null,
                union_id: null,
                notice_id: targetType === 'NOTICE' ? Number(targetId) : null,
            };

            const { error: dbError } = await supabase.from('files').insert(newFile);

            if (dbError) {
                console.error(`DB insert failed: ${file.name}`, dbError);
                // 롤백 로직 (파일 삭제 등) 필요할 수 있음
            }
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
     * 파일 목록 조회
     * unionId 또는 noticeId로 조회
     */
    getFiles: async ({ unionId, noticeId }: { unionId?: string; noticeId?: string }): Promise<FileRecord[]> => {
        let query = supabase.from('files').select('*').order('created_at', { ascending: false });

        if (noticeId) {
            query = query.eq('notice_id', noticeId);
        } else if (unionId) {
            query = query.eq('union_id', unionId);
        } else {
            return [];
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Fetch files failed: ${error.message}`);
        }

        return data;
    },

    // 기존 호환성 유지 (unionId 기준)
    getFilesByUnion: async (unionId: string): Promise<FileRecord[]> => {
        return fileApi.getFiles({ unionId });
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
     */
    getDownloadUrl: async (path: string): Promise<string> => {
        const { data } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, 60 * 60);

        if (!data?.signedUrl) {
            throw new Error('Failed to create signed URL');
        }
        return data.signedUrl;
    },
};
