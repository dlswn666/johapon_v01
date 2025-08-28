'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// v2: default import가 맞습니다.
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

import { Button } from '@/shared/ui/button';
import {
    Bold,
    Italic,
    Strikethrough, // 아이콘과 동작(취소선) 일치
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Image as ImageIcon,
    Link as LinkIcon,
    Undo,
    Redo,
} from 'lucide-react';

interface TiptapEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    readonly?: boolean;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({
    content,
    onChange,
    placeholder = '내용을 입력하세요...',
    readonly = false,
}) => {
    const editor = useEditor({
        // ✅ Next.js SSR 수화 불일치 방지(필수)
        immediatelyRender: false,

        extensions: [
            StarterKit.configure({
                bulletList: { keepMarks: true, keepAttributes: false },
                orderedList: { keepMarks: true, keepAttributes: false },
            }),
            TextStyle,
            Color,
            TextAlign.configure({
                // ✅ v2에서 지원되는 옵션만 사용
                types: ['heading', 'paragraph'],
                defaultAlignment: 'left',
            }),
            Image,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline cursor-pointer',
                },
            }),
            Placeholder.configure({
                placeholder: placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content,
        editable: !readonly,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            const isEmpty = editor.getText().trim().length === 0; // 빈 컨텐츠 보강 체크
            onChange(isEmpty || html === '<p></p>' ? '' : html);
        },
        editorProps: {
            attributes: {
                class: 'prose max-w-none min-h-[400px] p-4 focus:outline-none bg-white',
            },
        },
    });

    // readonly 상태 변경 시 에디터 editable 속성 업데이트
    useEffect(() => {
        if (editor) {
            editor.setEditable(!readonly);
        }
    }, [editor, readonly]);

    // 외부 content가 바뀌면 에디터에 반영(emitUpdate 막아 중복 onChange 방지)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content, false);
        }
    }, [content, editor]);

    // 초기화 전에는 아무것도 렌더하지 않음(SSR/Hydration 안정성)
    if (!editor) return null;

    // readonly 모드: 툴바 없이 내용만
    if (readonly) {
        return (
            <div className="border rounded-lg overflow-hidden bg-white">
                <EditorContent editor={editor} />
            </div>
        );
    }

    const handleImageUpload = () => {
        const url = window.prompt('이미지 URL을 입력하세요:');
        if (url) editor.chain().focus().setImage({ src: url }).run();
    };

    const handleLinkAdd = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('링크 URL을 입력하세요:', previousUrl);

        if (url === null) return; // 취소
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    // left는 기본 정렬이라 center/right가 아니면 left로 간주
    const isAlignLeftActive =
        editor.isActive({ textAlign: 'left' }) ||
        (!editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }));

    return (
        <div className="border rounded-lg overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="border-b bg-gray-50 p-2">
                <div className="flex items-center space-x-1 flex-wrap gap-2">
                    {/* Undo/Redo */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        className="h-8 w-8 p-0"
                        aria-label="Undo"
                        title="Undo"
                    >
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        className="h-8 w-8 p-0"
                        aria-label="Redo"
                        title="Redo"
                    >
                        <Redo className="h-4 w-4" />
                    </Button>

                    <div className="border-l border-gray-300 h-6 mx-1" />

                    {/* Text formatting */}
                    <Button
                        type="button"
                        variant={editor.isActive('bold') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className="h-8 w-8 p-0"
                        aria-label="Bold"
                        title="Bold"
                    >
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant={editor.isActive('italic') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className="h-8 w-8 p-0"
                        aria-label="Italic"
                        title="Italic"
                    >
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant={editor.isActive('strike') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className="h-8 w-8 p-0"
                        aria-label="Strikethrough"
                        title="Strikethrough"
                    >
                        <Strikethrough className="h-4 w-4" />
                    </Button>

                    <div className="border-l border-gray-300 h-6 mx-1" />

                    {/* Lists */}
                    <Button
                        type="button"
                        variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className="h-8 w-8 p-0"
                        aria-label="Bullet List"
                        title="Bullet List"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className="h-8 w-8 p-0"
                        aria-label="Ordered List"
                        title="Ordered List"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </Button>

                    <div className="border-l border-gray-300 h-6 mx-1" />

                    {/* Text alignment */}
                    <Button
                        type="button"
                        variant={isAlignLeftActive ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        className="h-8 w-8 p-0"
                        aria-label="Align Left"
                        title="Align Left"
                    >
                        <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        className="h-8 w-8 p-0"
                        aria-label="Align Center"
                        title="Align Center"
                    >
                        <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        className="h-8 w-8 p-0"
                        aria-label="Align Right"
                        title="Align Right"
                    >
                        <AlignRight className="h-4 w-4" />
                    </Button>

                    <div className="border-l border-gray-300 h-6 mx-1" />

                    {/* Image and Link */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleImageUpload}
                        className="h-8 w-8 p-0"
                        aria-label="Insert Image"
                        title="Insert Image"
                    >
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant={editor.isActive('link') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={handleLinkAdd}
                        className="h-8 w-8 p-0"
                        aria-label="Insert/Update Link"
                        title="Insert/Update Link"
                    >
                        <LinkIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />

            <style jsx global>{`
                .ProseMirror {
                    outline: none;
                }

                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #9ca3af;
                    pointer-events: none;
                    height: 0;
                }

                .ProseMirror ul,
                .ProseMirror ol {
                    padding-left: 1rem;
                }

                .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                }
            `}</style>
        </div>
    );
};

export default TiptapEditor;
