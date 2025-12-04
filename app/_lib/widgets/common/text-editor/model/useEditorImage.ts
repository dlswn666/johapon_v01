import { useCallback } from 'react';
import useNoticeStore from '@/app/_lib/features/notice/model/useNoticeStore';
import { Editor } from '@tiptap/react';
import toast from 'react-hot-toast';

export const useEditorImage = (editor: Editor | null) => {
    const addEditorImage = useNoticeStore((state) => state.addEditorImage);

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

                    // 2. Store file in NoticeStore for later upload
                    addEditorImage(blobUrl, file);

                    // 3. Insert blob URL into editor
                    editor.chain().focus().setImage({ src: blobUrl }).run();
                } catch (error) {
                    console.error('Image processing failed:', error);
                    toast.error('이미지 삽입에 실패했습니다.');
                }
            }
        };

        input.click();
    }, [editor, addEditorImage]);

    return { addImage };
};
