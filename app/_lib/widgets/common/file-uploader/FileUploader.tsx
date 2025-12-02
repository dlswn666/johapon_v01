'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import { useFileStore } from '@/app/_lib/shared/stores/file/useFileStore';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, X, File as FileIcon, Download, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
    /**
     * 영구 저장된 파일을 조회할 대상 ID (Notice ID or Union ID)
     * 작성 중(New)일 때는 undefined 일 수 있음
     */
    targetId?: string;
    targetType?: 'NOTICE' | 'UNION';

    /**
     * 파일 업로드 경로에 사용될 Union Slug
     */
    unionSlug: string;
    unionId?: string; // Legacy support

    /**
     * 읽기 전용 모드 (상세 조회용)
     */
    readOnly?: boolean;

    /**
     * 임시 업로드 완료 시 부모에게 알림 (작성 폼 유효성 검사 등 활용)
     */
    onUploadComplete?: (hasFiles: boolean) => void;
}

export function FileUploader({
    targetId,
    targetType = 'NOTICE',
    // unionSlug,  // unused var removed or kept but silenced if needed for interface compatibility
    // unionId,    // unused var
    readOnly = false,
    onUploadComplete,
}: FileUploaderProps) {
    const {
        files,
        tempFiles,
        isLoading,
        isUploading,
        fetchFiles,
        uploadTempFile,
        removeTempFile,
        deleteFile,
        getDownloadUrl,
        // clearTempFiles
    } = useFileStore();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const uniqueId = useId();
    const inputId = `file-upload-input-${uniqueId}`;
    // const [currentUser, setCurrentUser] = useState<string | null>(null);

    // 초기 로드: targetId가 있으면 기존 파일 조회, 없으면(작성중) 임시 파일 초기화
    useEffect(() => {
        // const checkUser = async () => {
        //   const { data: { user } } = await supabase.auth.getUser();
        //   setCurrentUser(user?.id || null);
        // };
        // checkUser();

        if (targetId) {
            if (targetType === 'NOTICE') {
                fetchFiles({ noticeId: targetId });
            } else {
                fetchFiles({ unionId: targetId });
            }
        } else {
            // 작성 모드 진입 시 임시 파일 초기화 (필요시)
            // clearTempFiles(); // 페이지 언마운트 시 하는게 나을 수 있음
        }

        return () => {
            // 페이지를 벗어날 때 임시 파일 상태 초기화 여부는 기획에 따라 다름.
            // 보통 작성 취소 시 초기화.
        };
    }, [targetId, targetType, fetchFiles]);

    // 임시 파일 상태 변경 알림
    useEffect(() => {
        if (onUploadComplete) {
            onUploadComplete(tempFiles.length > 0);
        }
    }, [tempFiles, onUploadComplete]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 10MB 제한
        if (file.size > 10 * 1024 * 1024) {
            alert('파일 크기는 10MB를 초과할 수 없습니다.');
            return;
        }

        try {
            if (targetId) {
                // 이미 생성된 글(수정/상세)에서 추가 업로드 -> 즉시 저장 로직?
                // 기획상 "수정" 모드에서도 임시 저장 후 저장을 눌러야 반영되는게 안전함.
                // 하지만 기존 Legacy 로직(즉시 저장)을 유지할지 결정 필요.
                // 여기서는 일단 '작성 중'과 동일하게 임시 업로드로 통일하고,
                // 부모 컴포넌트(EditPage)에서 confirmFiles를 호출하도록 유도하는게 좋음.
                // 다만 수정 페이지 로직이 복잡해지므로, targetId가 있으면 기존 Direct Upload를 쓸 수도 있음.
                // 이번 요구사항은 'Notice 작성' 위주이므로 임시 업로드 사용.
                await uploadTempFile(file);
            } else {
                // 작성 중 -> 임시 업로드
                await uploadTempFile(file);
            }

            // 입력 초기화
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Upload failed', error);
            alert('파일 업로드에 실패했습니다.');
        }
    };

    const handleDownload = async (path: string, fileName: string) => {
        try {
            // 원본 파일명을 전달하여 다운로드 시 원본 파일명으로 저장되도록 함
            const url = await getDownloadUrl(path, fileName);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName; // 원본 파일명으로 다운로드
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed', error);
            alert('다운로드 주소를 가져오는데 실패했습니다.');
        }
    };

    const handleDelete = async (fileId: string, filePath: string) => {
        if (!confirm('정말로 이 파일을 삭제하시겠습니까?')) return;
        try {
            await deleteFile(fileId, filePath);
        } catch (error) {
            console.error('Delete failed', error);
            alert('파일 삭제에 실패했습니다.');
        }
    };

    const handleRemoveTemp = (tempId: string) => {
        removeTempFile(tempId);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 드래그앤드랍 이벤트 핸들러
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!readOnly) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (readOnly || isUploading) return;

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length === 0) return;

        // 첫 번째 파일만 처리 (단일 파일 업로드)
        const file = droppedFiles[0];

        // 10MB 제한
        if (file.size > 10 * 1024 * 1024) {
            alert('파일 크기는 10MB를 초과할 수 없습니다.');
            return;
        }

        try {
            await uploadTempFile(file);
        } catch (error) {
            console.error('Upload failed', error);
            alert('파일 업로드에 실패했습니다.');
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <FileIcon className="h-5 w-5" />
                    파일 첨부
                </CardTitle>
                {!readOnly && (
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            id={inputId}
                        />
                        <label
                            htmlFor={inputId}
                            className={cn(
                                buttonVariants({ variant: 'outline', size: 'sm' }),
                                isUploading && 'opacity-50 pointer-events-none cursor-not-allowed'
                            )}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    업로드 중...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    파일 추가
                                </>
                            )}
                        </label>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {/* 1. 영구 저장된 파일 목록 (조회/수정 시) */}
                {files.length > 0 && (
                    <div className="space-y-2 mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 mb-2">저장된 파일</h4>
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                                        <FileIcon className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate text-sm">{file.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {formatFileSize(file.size)} •{' '}
                                            {new Date(file.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleDownload(file.path, file.name)}
                                        title="다운로드"
                                    >
                                        <Download className="h-4 w-4 text-gray-600" />
                                    </Button>

                                    {!readOnly && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(file.id, file.path)}
                                            title="삭제"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. 임시 업로드 파일 목록 (작성 중) */}
                {!readOnly && tempFiles.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 mb-2">
                            업로드 대기 중 ({tempFiles.length})
                        </h4>
                        {tempFiles.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between p-3 border rounded-lg border-blue-100 bg-blue-50/30"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-white p-2 rounded-full border border-blue-100 flex-shrink-0">
                                        {file.status === 'uploading' ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                        ) : file.status === 'error' ? (
                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate text-sm">{file.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{formatFileSize(file.size)}</span>
                                            {file.status === 'uploading' && (
                                                <span className="text-blue-500">업로드 중...</span>
                                            )}
                                            {file.status === 'error' && (
                                                <span className="text-red-500">업로드 실패</span>
                                            )}
                                            {file.status === 'completed' && (
                                                <span className="text-green-600">준비 완료</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-gray-600"
                                        onClick={() => handleRemoveTemp(file.id)}
                                        title="취소"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State (파일이 없을 때만 표시) */}
                {files.length === 0 && tempFiles.length === 0 && !isLoading && (
                    <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                        <p className="text-sm">첨부된 파일이 없습니다.</p>
                    </div>
                )}

                {/* 드래그앤드랍 영역 (readOnly가 아닐 때 항상 표시) */}
                {!readOnly && (
                    <label
                        htmlFor={inputId}
                        className={`mt-4 block text-center py-6 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                            isDragging
                                ? 'border-blue-500 bg-blue-50 text-blue-600'
                                : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400 hover:bg-gray-100'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                        {isDragging ? (
                            <p className="text-sm font-medium">파일을 여기에 놓으세요</p>
                        ) : (
                            <p className="text-xs mt-1 text-gray-400">클릭하거나 파일을 드래그하여 업로드하세요.</p>
                        )}
                    </label>
                )}

                {isLoading && files.length === 0 && (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
