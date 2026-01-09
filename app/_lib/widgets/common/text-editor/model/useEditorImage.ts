import { useCallback } from 'react';
import { Editor } from '@tiptap/react';
import toast from 'react-hot-toast';

/**
 * 에디터 이미지 삽입 훅
 * @param editor - Tiptap 에디터 인스턴스
 * @param onAddImage - 이미지 파일 추가 콜백 (blobUrl, file) => void
 *                     외부에서 Store의 addEditorImage 함수를 전달받음
 */
export const useEditorImage = (
    editor: Editor | null,
    onAddImage?: (blobUrl: string, file: File) => void
) => {
    const addImage = useCallback(() => {
        if (!editor) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    // 1. Create Blob URL for local preview
                    const blobUrl = URL.createObjectURL(file);

                    // 2. Store file in Store for later upload (외부에서 주입된 콜백 사용)
                    if (onAddImage) {
                        onAddImage(blobUrl, file);
                    }

                    // 3. Insert blob URL into editor
                    editor.chain().focus().setImage({ src: blobUrl }).run();
                } catch (error) {
                    console.error('Image processing failed:', error);
                    toast.error('이미지 삽입에 실패했습니다.');
                }
            }
        };

        input.click();
    }, [editor, onAddImage]);

    return { addImage };
};
