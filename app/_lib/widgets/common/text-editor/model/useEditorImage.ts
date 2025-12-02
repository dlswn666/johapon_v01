import { useCallback } from 'react';
import { useFileStore } from '@/app/_lib/shared/stores/file/useFileStore';
import { fileApi } from '@/app/_lib/shared/hooks/file/fileApi';
import { Editor } from '@tiptap/react';
import toast from 'react-hot-toast';

export const useEditorImage = (editor: Editor | null) => {
    const { uploadTempFile } = useFileStore();

    const addImage = useCallback(() => {
        if (!editor) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const toastId = toast.loading('이미지 업로드 중...');
                try {
                    // 1. 임시 파일 업로드
                    const result = await uploadTempFile(file);

                    if (result) {
                        // 2. 다운로드 URL 생성 (Signed URL)
                        // 주의: Private Bucket인 경우 URL 만료 가능성 있음
                        const url = await fileApi.getDownloadUrl(result.path);

                        // 3. 에디터에 이미지 삽입
                        editor.chain().focus().setImage({ src: url }).run();
                        toast.success('이미지가 삽입되었습니다.', { id: toastId });
                    }
                } catch (error) {
                    console.error('Image upload failed:', error);
                    toast.error('이미지 업로드에 실패했습니다.', { id: toastId });
                }
            }
        };

        input.click();
    }, [editor, uploadTempFile]);

    return { addImage };
};

