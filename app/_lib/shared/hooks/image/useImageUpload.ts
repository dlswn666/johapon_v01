'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/app/_lib/shared/supabase/client';
import {
    IMAGE_CONFIGS,
    ImageType,
    ImageConfig,
    formatFileSize,
    isRecommendedRatio,
    calculateRatioDifference,
} from '@/app/_lib/shared/constants/imageConfig';

export interface ImageInfo {
    /** 원본 파일 */
    file: File;
    /** 미리보기 URL (로컬) */
    previewUrl: string;
    /** 원본 크기 */
    originalSize: {
        width: number;
        height: number;
        bytes: number;
    };
    /** 리사이징된 크기 (리사이징 후) */
    resizedSize?: {
        width: number;
        height: number;
        bytes: number;
    };
    /** 권장 비율 여부 */
    isRecommendedRatio: boolean;
    /** 비율 차이 (%) */
    ratioDifference: number;
}

export interface UseImageUploadOptions {
    /** 이미지 타입 */
    imageType: ImageType;
    /** Storage 경로 (예: 'unions/slug/hero-slides') */
    storagePath: string;
    /** 고해상도(2x) 사용 여부 */
    useHighRes?: boolean;
    /** 업로드 완료 콜백 */
    onUploadComplete?: (url: string) => void;
    /** 에러 콜백 */
    onError?: (error: string) => void;
}

export interface UseImageUploadReturn {
    /** 현재 이미지 정보 */
    imageInfo: ImageInfo | null;
    /** 업로드된 URL */
    uploadedUrl: string | null;
    /** 로딩 상태 */
    isLoading: boolean;
    /** 리사이징 중 */
    isResizing: boolean;
    /** 업로드 중 */
    isUploading: boolean;
    /** 에러 메시지 */
    error: string | null;
    /** 이미지 설정 */
    config: ImageConfig;
    /** 파일 선택 핸들러 */
    handleFileSelect: (file: File) => Promise<void>;
    /** 이미지 업로드 핸들러 */
    uploadImage: () => Promise<string | null>;
    /** 이미지 제거 핸들러 */
    removeImage: () => void;
    /** 초기 URL 설정 (수정 모드용) */
    setInitialUrl: (url: string) => void;
}

/**
 * 이미지 업로드 Hook
 * 파일 선택 → 리사이징 → 업로드 흐름을 관리합니다.
 */
export function useImageUpload({
    imageType,
    storagePath,
    useHighRes = false,
    onUploadComplete,
    onError,
}: UseImageUploadOptions): UseImageUploadReturn {
    const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resizedBuffer, setResizedBuffer] = useState<string | null>(null);
    const [resizedMimeType, setResizedMimeType] = useState<string>('image/webp');

    const config = IMAGE_CONFIGS[imageType];

    /**
     * 이미지 메타데이터 가져오기
     */
    const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    /**
     * 파일 선택 핸들러
     */
    const handleFileSelect = useCallback(
        async (file: File) => {
            setError(null);

            // 파일 크기 검증
            if (file.size > config.maxFileSize) {
                const errorMsg = `파일 크기가 너무 큽니다. 최대 ${formatFileSize(config.maxFileSize)}까지 허용됩니다.`;
                setError(errorMsg);
                onError?.(errorMsg);
                return;
            }

            // 파일 형식 검증
            if (!config.acceptedFormats.includes(file.type)) {
                const errorMsg = `지원하지 않는 파일 형식입니다. ${config.acceptedFormats
                    .map((f) => f.replace('image/', '').toUpperCase())
                    .join(', ')} 형식만 허용됩니다.`;
                setError(errorMsg);
                onError?.(errorMsg);
                return;
            }

            try {
                // 이미지 크기 가져오기
                const dimensions = await getImageDimensions(file);
                const previewUrl = URL.createObjectURL(file);
                const ratioMatch = isRecommendedRatio(dimensions.width, dimensions.height, config);
                const ratioDiff = calculateRatioDifference(dimensions.width, dimensions.height, config);

                setImageInfo({
                    file,
                    previewUrl,
                    originalSize: {
                        width: dimensions.width,
                        height: dimensions.height,
                        bytes: file.size,
                    },
                    isRecommendedRatio: ratioMatch,
                    ratioDifference: ratioDiff,
                });

                // 리사이징 API 호출
                setIsResizing(true);
                const formData = new FormData();
                formData.append('file', file);
                formData.append('imageType', imageType);
                formData.append('useHighRes', String(useHighRes));

                const response = await fetch('/api/image/resize', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || '이미지 리사이징 실패');
                }

                // 리사이징 결과 저장
                setResizedBuffer(result.data.buffer);
                setResizedMimeType(result.data.mimeType);
                setImageInfo((prev) =>
                    prev
                        ? {
                              ...prev,
                              previewUrl: result.data.dataUrl,
                              resizedSize: result.data.resizedSize,
                          }
                        : null
                );
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : '이미지 처리 중 오류가 발생했습니다.';
                setError(errorMsg);
                onError?.(errorMsg);
            } finally {
                setIsResizing(false);
            }
        },
        [config, imageType, useHighRes, onError]
    );

    /**
     * 이미지 업로드 핸들러
     */
    const uploadImage = useCallback(async (): Promise<string | null> => {
        // 이미 업로드된 URL이 있으면 반환
        if (uploadedUrl && !imageInfo?.file) {
            return uploadedUrl;
        }

        if (!resizedBuffer) {
            setError('업로드할 이미지가 없습니다.');
            return null;
        }

        setIsUploading(true);
        setError(null);

        try {
            // Base64를 Blob으로 변환
            const byteCharacters = atob(resizedBuffer);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: resizedMimeType });

            // 파일 확장자 결정
            const ext = resizedMimeType === 'image/png' ? 'png' : 'webp';
            const fileName = `${storagePath}/${Date.now()}.${ext}`;

            // Supabase Storage에 업로드
            const { error: uploadError } = await supabase.storage.from('files').upload(fileName, blob, {
                contentType: resizedMimeType,
                upsert: false,
            });

            if (uploadError) {
                throw uploadError;
            }

            // Public URL 가져오기
            const {
                data: { publicUrl },
            } = supabase.storage.from('files').getPublicUrl(fileName);

            setUploadedUrl(publicUrl);
            onUploadComplete?.(publicUrl);

            return publicUrl;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : '이미지 업로드 중 오류가 발생했습니다.';
            setError(errorMsg);
            onError?.(errorMsg);
            return null;
        } finally {
            setIsUploading(false);
        }
    }, [resizedBuffer, resizedMimeType, storagePath, uploadedUrl, imageInfo, onUploadComplete, onError]);

    /**
     * 이미지 제거 핸들러
     */
    const removeImage = useCallback(() => {
        if (imageInfo?.previewUrl) {
            URL.revokeObjectURL(imageInfo.previewUrl);
        }
        setImageInfo(null);
        setUploadedUrl(null);
        setResizedBuffer(null);
        setError(null);
    }, [imageInfo]);

    /**
     * 초기 URL 설정 (수정 모드용)
     */
    const setInitialUrl = useCallback((url: string) => {
        setUploadedUrl(url);
    }, []);

    return {
        imageInfo,
        uploadedUrl,
        isLoading: isResizing || isUploading,
        isResizing,
        isUploading,
        error,
        config,
        handleFileSelect,
        uploadImage,
        removeImage,
        setInitialUrl,
    };
}

export default useImageUpload;

