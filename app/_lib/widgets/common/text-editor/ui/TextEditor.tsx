import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { EditorToolbar } from './EditorToolbar';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TextEditorProps {
    content?: string;
    onChange?: (content: string) => void;
    placeholder?: string;
    editable?: boolean;
    className?: string;
}

export const TextEditor = ({
    content = '',
    onChange,
    placeholder = '내용을 입력하세요...',
    editable = true,
    className,
}: TextEditorProps) => {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
            Placeholder.configure({
                placeholder,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content,
        editable,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[200px] p-4',
            },
        },
    });

    // Update content if changed externally (e.g. from initial load)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Only update if content is different to avoid cursor jumping or infinite loops
            // A simple check might not be enough for complex HTML, but usually okay for initial load
            if (editor.isEmpty && content) {
                 editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className={cn("border border-input rounded-md bg-white shadow-sm w-full overflow-hidden", className)}>
            <EditorToolbar editor={editor} />
            <EditorContent editor={editor} className="bg-white" />
        </div>
    );
};

