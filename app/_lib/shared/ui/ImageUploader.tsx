'use client';

import React, { useCallback, useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
    ImageType,
    IMAGE_CONFIGS,
    formatFileSize,
    getRecommendedSizeText,
    getAcceptedFormatsText,
    getAcceptString,
} from '@/app/_lib/shared/constants/imageConfig';
import { useImageUpload } from '@/app/_lib/shared/hooks/image/useImageUpload';

export interface ImageUploaderProps {
    /** 이미지 타입 */
    imageType: ImageType;
    /** Storage 경로 (예: 'unions/slug/hero-slides') */
    storagePath: string;
    /** 라벨 */
    label?: string;
    /** 필수 여부 */
    required?: boolean;
    /** 읽기 전용 */
    disabled?: boolean;
    /** 초기 이미지 URL (수정 모드) */
    initialImageUrl?: string;
    /** 고해상도(2x) 사용 여부 */
    useHighRes?: boolean;
    /** 이미지 변경 콜백 */
    onImageChange?: (url: string | null) => void;
    /** 에러 콜백 */
    onError?: (error: string) => void;
    /** 미리보기 높이 */
    previewHeight?: string;
    /** 클래스명 */
    className?: string;
}

/**
 * 공통 이미지 업로더 컴포넌트
 * - 드래그 앤 드롭 지원
 * - 이미지 유형별 권장 크기/비율 안내
 * - 현재 선택된 이미지의 크기/비율 표시
 * - Sharp를 통한 자동 리사이징 (contain 방식)
 */
export function ImageUploader({
    imageType,
    storagePath,
    label,
    required = false,
    disabled = false,
    initialImageUrl,
    useHighRes = false,
    onImageChange,
    onError,
    previewHeight = 'h-[300px]',
    className,
}: ImageUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    // 초기값으로 initialImageUrl 설정
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

    const config = IMAGE_CONFIGS[imageType];

    const {
        imageInfo,
        uploadedUrl,
        isLoading,
        isResizing,
        isUploading,
        error,
        handleFileSelect,
        uploadImage,
        removeImage,
        setInitialUrl,
    } = useImageUpload({
        imageType,
        storagePath,
        useHighRes,
        onUploadComplete: (url) => {
            setLocalPreviewUrl(url);
            onImageChange?.(url);
        },
        onError,
    });

    // 미리보기 URL 계산 (우선순위: 로컬 상태 > 이미지 정보 > 업로드된 URL > 초기 URL)
    const previewUrl = useMemo(() => {
        if (localPreviewUrl) return localPreviewUrl;
        if (imageInfo?.previewUrl) return imageInfo.previewUrl;
        if (uploadedUrl) return uploadedUrl;
        return initialImageUrl || null;
    }, [localPreviewUrl, imageInfo?.previewUrl, uploadedUrl, initialImageUrl]);

    // 초기 URL이 변경되면 Hook에 설정
    useMemo(() => {
        if (initialImageUrl) {
            setInitialUrl(initialImageUrl);
        }
    }, [initialImageUrl, setInitialUrl]);

    /**
     * 파일 입력 클릭
     */
    const handleClick = useCallback(() => {
        if (!disabled && inputRef.current) {
            inputRef.current.click();
        }
    }, [disabled]);

    /**
     * 파일 선택 핸들러
     */
    const handleInputChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                setLocalPreviewUrl(null); // 새 파일 선택 시 로컬 상태 초기화
                await handleFileSelect(file);
            }
            // input 초기화 (같은 파일 다시 선택 가능하도록)
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        },
        [handleFileSelect]
    );

    /**
     * 드래그 앤 드롭 핸들러
     */
    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (!disabled) {
                setIsDragging(true);
            }
        },
        [disabled]
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);

            if (disabled) return;

            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith('image/')) {
                setLocalPreviewUrl(null);
                await handleFileSelect(file);
            }
        },
        [disabled, handleFileSelect]
    );

    /**
     * 이미지 제거 핸들러
     */
    const handleRemove = useCallback(() => {
        removeImage();
        setLocalPreviewUrl(null);
        onImageChange?.(null);
    }, [removeImage, onImageChange]);

    return (
        <div className={cn('space-y-3', className)}>
            {/* 라벨 */}
            {label && (
                <Label className="flex items-center gap-1">
                    {label}
                    {required && <span className="text-red-500">*</span>}
                </Label>
            )}

            {/* 권장 사항 안내 */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-blue-700">
                    <p className="font-medium">권장 사항</p>
                    <ul className="mt-1 space-y-0.5 text-blue-600">
                        <li>• 권장 크기: {getRecommendedSizeText(config)}</li>
                        <li>• 허용 형식: {getAcceptedFormatsText(config)}</li>
                        <li>• 최대 용량: {formatFileSize(config.maxFileSize)}</li>
                    </ul>
                    <p className="mt-1 text-xs text-blue-500">
                        * 업로드된 이미지는 자동으로 최적 크기로 변환됩니다.
                    </p>
                </div>
            </div>

            {/* 이미지 미리보기 또는 업로드 영역 */}
            {previewUrl ? (
                <div className={cn('relative w-full', previewHeight)}>
                    <Image
                        src={previewUrl}
                        alt="이미지 미리보기"
                        fill
                        className="rounded-lg object-contain border bg-gray-50"
                    />
                    {!disabled && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transition-colors"
                            aria-label="이미지 제거"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                            <div className="text-center text-white">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                <p className="text-sm">{isResizing ? '이미지 최적화 중...' : '업로드 중...'}</p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div
                    onClick={handleClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        'w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors cursor-pointer',
                        previewHeight,
                        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100',
                        disabled && 'cursor-not-allowed opacity-50'
                    )}
                >
                    {isLoading ? (
                        <div className="text-center">
                            <Loader2 className="w-12 h-12 text-gray-400 mx-auto animate-spin" />
                            <p className="text-sm text-gray-500 mt-2">
                                {isResizing ? '이미지 최적화 중...' : '업로드 중...'}
                            </p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                            <p className="text-sm text-gray-500 mt-2">
                                클릭하거나 이미지를 드래그하여 업로드
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {getRecommendedSizeText(config)}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* 숨겨진 파일 입력 */}
            <input
                ref={inputRef}
                type="file"
                accept={getAcceptString(config)}
                onChange={handleInputChange}
                className="hidden"
                disabled={disabled}
            />

            {/* 이미지 정보 표시 */}
            {imageInfo && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600">원본 크기:</span>
                        <span className="font-medium">
                            {imageInfo.originalSize.width} x {imageInfo.originalSize.height}px
                            <span className="text-gray-400 ml-1">
                                ({formatFileSize(imageInfo.originalSize.bytes)})
                            </span>
                        </span>
                    </div>
                    {imageInfo.resizedSize && (
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">변환 후 크기:</span>
                            <span className="font-medium text-green-600">
                                {imageInfo.resizedSize.width} x {imageInfo.resizedSize.height}px
                                <span className="text-gray-400 ml-1">
                                    ({formatFileSize(imageInfo.resizedSize.bytes)})
                                </span>
                            </span>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600">비율 상태:</span>
                        {imageInfo.isRecommendedRatio ? (
                            <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                권장 비율과 일치
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="w-4 h-4" />
                                권장 비율과 {imageInfo.ratioDifference.toFixed(1)}% 차이
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* 에러 메시지 */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* 업로드 버튼 (선택적) */}
            {imageInfo && !isLoading && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={uploadImage}
                    disabled={isLoading}
                    className="w-full"
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            업로드 중...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 mr-2" />
                            이미지 업로드
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}

// 외부에서 uploadImage 호출을 위한 ref 인터페이스
export interface ImageUploaderRef {
    uploadImage: () => Promise<string | null>;
}

export default ImageUploader;
