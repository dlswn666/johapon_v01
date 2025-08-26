'use client';

import React, { useRef, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon } from 'lucide-react';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    readonly?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    content,
    onChange,
    placeholder = '내용을 입력하세요...',
    readonly = false,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);

    const handleContentChange = () => {
        if (editorRef.current && !readonly) {
            const newContent = editorRef.current.innerHTML;
            onChange(newContent);
        }
    };

    const execCommand = (command: string, value?: string) => {
        if (readonly) return;
        document.execCommand(command, false, value);
        handleContentChange();
        editorRef.current?.focus();
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (readonly) return;
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            execCommand('insertImage', url);
        }
    };

    // dangerouslySetInnerHTML을 사용하므로 useEffect는 더 이상 필요하지 않음
    // React가 자동으로 content prop 변경을 감지하여 DOM을 업데이트함

    if (readonly) {
        return (
            <div className="border rounded-lg overflow-hidden">
                <div className="min-h-[400px] p-4 prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            {/* Editor Toolbar */}
            <div className="border-b bg-gray-50 p-2">
                <div className="flex items-center space-x-1 flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCommand('bold')}
                        className="h-8 w-8 p-0"
                    >
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCommand('italic')}
                        className="h-8 w-8 p-0"
                    >
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCommand('underline')}
                        className="h-8 w-8 p-0"
                    >
                        <Underline className="h-4 w-4" />
                    </Button>
                    <div className="border-l border-gray-300 h-6 mx-1"></div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCommand('insertUnorderedList')}
                        className="h-8 w-8 p-0"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <div className="border-l border-gray-300 h-6 mx-1"></div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCommand('justifyLeft')}
                        className="h-8 w-8 p-0"
                    >
                        <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCommand('justifyCenter')}
                        className="h-8 w-8 p-0"
                    >
                        <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCommand('justifyRight')}
                        className="h-8 w-8 p-0"
                    >
                        <AlignRight className="h-4 w-4" />
                    </Button>
                    <div className="border-l border-gray-300 h-6 mx-1"></div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => document.getElementById('image-upload')?.click()}
                        className="h-8 w-8 p-0"
                    >
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Editor Content */}
            <div
                ref={editorRef}
                contentEditable={!readonly}
                onInput={handleContentChange}
                className="min-h-[400px] p-4 focus:outline-none editor-content prose max-w-none"
                style={{
                    lineHeight: '1.6',
                }}
                data-placeholder={placeholder}
                dangerouslySetInnerHTML={{ __html: content }}
                suppressContentEditableWarning={true}
            />

            <style jsx>{`
                .editor-content:empty:before {
                    content: attr(data-placeholder);
                    color: #9ca3af;
                    pointer-events: none;
                    font-style: italic;
                }
                .editor-content:focus:empty:before {
                    color: #d1d5db;
                }
            `}</style>
        </div>
    );
};

export default RichTextEditor;
