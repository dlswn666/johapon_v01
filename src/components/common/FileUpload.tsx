/**
 * 파일 업로드 컴포넌트
 * 업로드, 다운로드, 삭제 기능을 포함한 완전한 파일 관리 UI
 */

'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { useAttachmentStore } from '@/shared/store/attachmentStore';
import { Attachment, FileValidationRule, DEFAULT_FILE_VALIDATION } from '@/entities/attachment/model/types';
import { AttachmentService } from '@/shared/api/attachmentApi';
import {
    Upload,
    Download,
    Trash2,
    File,
    FileText,
    Image as ImageIcon,
    AlertCircle,
    CheckCircle,
    Loader2,
} from 'lucide-react';

interface FileUploadProps {
    slug: string;
    targetTable: string;
    targetId: string;
    validation?: FileValidationRule;
    className?: string;
    disabled?: boolean;
    showFileList?: boolean;
    onFileUploaded?: (attachment: Attachment) => void;
    onFileDeleted?: (fileId: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
    slug,
    targetTable,
    targetId,
    validation = DEFAULT_FILE_VALIDATION,
    className = '',
    disabled = false,
    showFileList = true,
    onFileUploaded,
    onFileDeleted,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const {
        uploadFile,
        deleteFile,
        loadAttachments,
        getAttachments,
        uploads,
        loading,
        error,
        clearError,
        isUploading,
    } = useAttachmentStore();

    const attachments = getAttachments(targetTable, targetId);

    // 컴포넌트 마운트 시 첨부파일 목록 로드
    useEffect(() => {
        if (slug && targetTable && targetId) {
            loadAttachments(slug, targetTable, targetId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, targetTable, targetId]); // loadAttachments는 stable function이므로 의존성에서 제외

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        await handleFiles(files);

        // 파일 input 초기화
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFiles = async (files: File[]) => {
        clearError();

        // 파일 수 제한 확인
        if (validation.maxFiles && attachments.length + files.length > validation.maxFiles) {
            alert(`최대 ${validation.maxFiles}개의 파일만 업로드 가능합니다.`);
            return;
        }

        for (const file of files) {
            // 파일 유효성 검사
            const validationError = AttachmentService.validateFile(file, validation.maxSize, validation.allowedTypes);

            if (validationError) {
                alert(`${file.name}: ${validationError}`);
                continue;
            }

            try {
                const attachmentId = await uploadFile({
                    slug,
                    target_table: targetTable,
                    target_id: targetId,
                    file,
                });

                // 업로드 완료 콜백 (약간의 지연 후 실행하여 attachments 갱신 대기)
                setTimeout(() => {
                    const updatedAttachments = getAttachments(targetTable, targetId);
                    const newAttachment = updatedAttachments.find((a) => a.id === attachmentId);
                    if (newAttachment && onFileUploaded) {
                        onFileUploaded(newAttachment);
                    }
                }, 500);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`Failed to upload ${file.name}:`, errorMessage);
                alert(`파일 업로드 실패: ${file.name} - ${errorMessage}`);
            }
        }
    };

    const handleDelete = async (attachment: Attachment) => {
        if (!confirm(`"${attachment.file_name}" 파일을 삭제하시겠습니까?`)) {
            return;
        }

        try {
            await deleteFile({ slug, fileId: attachment.id }, targetTable, targetId);

            if (onFileDeleted) {
                onFileDeleted(attachment.id);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to delete file:', errorMessage);
            alert(`파일 삭제 실패: ${errorMessage}`);
        }
    };

    const handleDownload = (attachment: Attachment) => {
        const downloadUrl = AttachmentService.getDownloadUrl(attachment.file_url);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = attachment.file_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 드래그 앤 드롭 핸들러
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    };

    const getFileIcon = (fileType: string) => {
        if (fileType.startsWith('image/')) {
            return <ImageIcon className="h-4 w-4 text-blue-500" />;
        } else if (fileType.includes('text/') || fileType.includes('document')) {
            return <FileText className="h-4 w-4 text-green-500" />;
        } else {
            return <File className="h-4 w-4 text-gray-500" />;
        }
    };

    const formatFileSize = AttachmentService.formatFileSize;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* 업로드 영역 */}
            <div
                className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={disabled ? undefined : handleFileSelect}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    accept={validation.allowedTypes?.join(',')}
                    style={{ display: 'none' }}
                    disabled={disabled}
                />

                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600 mb-1">파일을 여기에 드래그하거나 클릭하여 선택하세요</p>
                <p className="text-sm text-gray-500">
                    {validation.maxSize && `최대 ${formatFileSize(validation.maxSize)}`}
                    {validation.allowedTypes && ` · ${validation.allowedTypes.join(', ')}`}
                    {validation.maxFiles && ` · 최대 ${validation.maxFiles}개`}
                </p>
            </div>

            {/* 업로드 진행상황 */}
            {Object.values(uploads).length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">업로드 중...</h4>
                    {Object.values(uploads).map((upload) => (
                        <div key={upload.fileId} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                            {upload.status === 'uploading' && (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            )}
                            {upload.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {upload.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                            <span className="text-sm flex-1">{upload.fileName}</span>
                            <span className="text-xs text-gray-500">{upload.progress}%</span>
                        </div>
                    ))}
                </div>
            )}

            {/* 에러 메시지 */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700">{error}</span>
                    </div>
                </div>
            )}

            {/* 파일 목록 */}
            {showFileList && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">첨부파일 ({attachments.length})</h4>
                        {isUploading() && <span className="text-sm text-blue-600">업로드 중...</span>}
                    </div>

                    {loading && attachments.length === 0 ? (
                        <div className="text-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                            <p className="text-sm text-gray-500 mt-2">파일 목록을 불러오는 중...</p>
                        </div>
                    ) : attachments.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4 text-center">첨부된 파일이 없습니다.</p>
                    ) : (
                        <div className="space-y-2">
                            {attachments.map((attachment) => (
                                <div
                                    key={attachment.id}
                                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    {getFileIcon(attachment.file_type)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {attachment.file_name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatFileSize(attachment.file_size || 0)} · {attachment.file_type}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDownload(attachment)}
                                            className="h-8 w-8 p-0"
                                            title="다운로드"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(attachment)}
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                            title="삭제"
                                            disabled={disabled}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileUpload;
