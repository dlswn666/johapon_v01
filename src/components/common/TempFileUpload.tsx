/**
 * 임시 파일 업로드 컴포넌트
 * 게시글 작성 시 사용되며, 실제 저장 시점에 파일을 업로드
 */

'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { FileValidationRule, DEFAULT_FILE_VALIDATION } from '@/entities/attachment/model/types';
import { AttachmentService } from '@/shared/api/attachmentApi';
import { Upload, Trash2, File, FileText, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';

interface TempFile {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
}

interface TempFileUploadProps {
    validation?: FileValidationRule;
    className?: string;
    disabled?: boolean;
    onFilesChange?: (files: TempFile[]) => void;
    maxFiles?: number;
}

const TempFileUpload: React.FC<TempFileUploadProps> = ({
    validation = DEFAULT_FILE_VALIDATION,
    className = '',
    disabled = false,
    onFilesChange,
    maxFiles,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [tempFiles, setTempFiles] = useState<TempFile[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = () => setError(null);

    const handleFileInputClick = () => {
        if (disabled) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            await handleFiles(files);
        }
        // input 초기화
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFiles = async (files: File[]) => {
        clearError();

        // 파일 수 제한 확인
        const totalFiles = tempFiles.length + files.length;
        const limit = maxFiles || validation.maxFiles;
        if (limit && totalFiles > limit) {
            setError(`최대 ${limit}개의 파일만 업로드 가능합니다.`);
            return;
        }

        const validFiles: TempFile[] = [];

        for (const file of files) {
            // 파일 유효성 검사
            const validationError = AttachmentService.validateFile(file, validation.maxSize, validation.allowedTypes);

            if (validationError) {
                setError(`${file.name}: ${validationError}`);
                continue;
            }

            // 임시 파일 객체 생성
            const tempFile: TempFile = {
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                file,
                name: file.name,
                size: file.size,
                type: file.type,
            };

            validFiles.push(tempFile);
        }

        if (validFiles.length > 0) {
            const newTempFiles = [...tempFiles, ...validFiles];
            setTempFiles(newTempFiles);
            onFilesChange?.(newTempFiles);
        }
    };

    const handleRemove = (tempFileId: string) => {
        const newTempFiles = tempFiles.filter((f) => f.id !== tempFileId);
        setTempFiles(newTempFiles);
        onFilesChange?.(newTempFiles);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (disabled) return;
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFiles(files);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileType: string) => {
        if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-600" />;
        if (fileType.includes('text') || fileType.includes('document'))
            return <FileText className="h-5 w-5 text-blue-600" />;
        return <File className="h-5 w-5 text-blue-600" />;
    };

    return (
        <div className={`space-y-3 ${className}`}>
            {/* 업로드 영역 */}
            <div
                className={`
                    relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer group
                    ${
                        dragOver
                            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleFileInputClick}
            >
                <div className="text-center">
                    <div
                        className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                            dragOver ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-blue-50'
                        }`}
                    >
                        <Upload
                            className={`h-8 w-8 transition-colors ${
                                dragOver ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'
                            }`}
                        />
                    </div>
                    <div className="mt-4">
                        <p className="text-lg font-medium text-gray-900 mb-1">파일 첨부하기</p>
                        <p className="text-base text-gray-600">파일을 여기에 끌어다 놓거나 클릭해서 선택하세요</p>
                        {validation.maxSize && (
                            <p className="text-sm text-gray-500 mt-2">
                                파일 하나당 최대 {formatFileSize(validation.maxSize)}
                            </p>
                        )}
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept={validation.allowedTypes?.map((type) => `.${type}`).join(',')}
                    onChange={handleFileChange}
                    disabled={disabled}
                />
            </div>

            {/* 에러 표시 */}
            {error && (
                <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700">{error}</span>
                </div>
            )}

            {/* 선택된 파일 목록 */}
            {tempFiles.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-base font-medium text-gray-900">첨부된 파일 {tempFiles.length}개</h4>
                    <div className="space-y-2">
                        {tempFiles.map((tempFile) => (
                            <div
                                key={tempFile.id}
                                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                            >
                                <div className="flex items-center space-x-4 flex-1">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                        {getFileIcon(tempFile.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{tempFile.name}</p>
                                        <p className="text-sm text-gray-500">{formatFileSize(tempFile.size)}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(tempFile.id);
                                    }}
                                    disabled={disabled}
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TempFileUpload;
export type { TempFile };
