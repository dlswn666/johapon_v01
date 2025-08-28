'use client';

import React, { useRef, useEffect, useCallback } from 'react';
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
    const isUpdatingRef = useRef(false);

    // 커서 위치 저장 및 복원 함수
    const saveCursorPosition = useCallback(() => {
        if (!editorRef.current) return null;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;

        const range = selection.getRangeAt(0);
        return {
            startContainer: range.startContainer,
            startOffset: range.startOffset,
            endContainer: range.endContainer,
            endOffset: range.endOffset,
        };
    }, []);

    const restoreCursorPosition = useCallback((position: any) => {
        if (!position || !editorRef.current) return;

        try {
            const selection = window.getSelection();
            if (!selection) return;

            const range = document.createRange();
            range.setStart(position.startContainer, position.startOffset);
            range.setEnd(position.endContainer, position.endOffset);

            selection.removeAllRanges();
            selection.addRange(range);
        } catch (error) {
            // 커서 복원 실패 시 에디터 끝으로 이동
            const range = document.createRange();
            const selection = window.getSelection();
            if (selection && editorRef.current) {
                range.selectNodeContents(editorRef.current);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }, []);

    // 에디터가 비어있는지 확인하는 함수
    const updateEmptyState = useCallback(() => {
        if (editorRef.current) {
            const text = editorRef.current.textContent || '';
            const isEmpty = text.trim() === '';
            editorRef.current.setAttribute('data-empty', isEmpty.toString());
        }
    }, []);

    const handleContentChange = useCallback(() => {
        if (editorRef.current && !readonly && !isUpdatingRef.current) {
            const newContent = editorRef.current.innerHTML;
            updateEmptyState();
            onChange(newContent);
        }
    }, [onChange, readonly, updateEmptyState]);

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

    // content prop 변경 시 에디터 내용 업데이트
    useEffect(() => {
        if (editorRef.current && !isUpdatingRef.current) {
            const currentContent = editorRef.current.innerHTML;
            const newContent = content || '';

            console.log('=== RichTextEditor useEffect ===');
            console.log('readonly:', readonly);
            console.log('currentContent:', currentContent);
            console.log('newContent:', newContent);
            console.log('content prop:', content);

            // readonly가 false일 때(수정 모드)에만 content 업데이트
            if (!readonly) {
                console.log('Edit mode - updating content...');
                isUpdatingRef.current = true;

                editorRef.current.innerHTML = newContent;
                console.log('After setting innerHTML:', editorRef.current.innerHTML);

                updateEmptyState();

                setTimeout(() => {
                    isUpdatingRef.current = false;
                    console.log('Content update completed');
                }, 0);
            } else {
                console.log('Readonly mode - skipping content update');
                updateEmptyState();
            }
        }
    }, [content, readonly, updateEmptyState]);

    if (readonly) {
        return (
            <div className="border rounded-lg overflow-hidden bg-white">
                <div
                    className="min-h-[400px] p-4 prose max-w-none bg-white"
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-hidden bg-white">
            {/* Editor Toolbar */}
            <div className="border-b bg-white p-2">
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
                className="min-h-[400px] p-4 focus:outline-none editor-content prose max-w-none bg-white"
                style={{
                    lineHeight: '1.6',
                    backgroundColor: 'white',
                }}
                data-placeholder={placeholder}
                data-empty="true"
                suppressContentEditableWarning={true}
            />

            <style jsx>{`
                .editor-content[data-empty='true']:before {
                    content: attr(data-placeholder);
                    color: #9ca3af;
                    pointer-events: none;
                    font-style: italic;
                }
                .editor-content[data-empty='true']:focus:before {
                    color: #6b7280;
                }
            `}</style>
        </div>
    );
};

export default RichTextEditor;
