'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { HeroSlide } from '@/app/_lib/shared/type/database.types';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { ImageUploader } from '@/app/_lib/shared/ui/ImageUploader';
import { useImageUpload } from '@/app/_lib/shared/hooks/image/useImageUpload';
import { ActionButton } from '@/app/_lib/widgets/common/button';

interface HeroSlideFormData {
    image_url: string;
    link_url: string;
    display_order: number;
    is_active: boolean;
}

interface HeroSlideFormProps {
    mode: 'create' | 'edit' | 'view';
    initialData?: HeroSlide | null;
    onSubmit?: (data: HeroSlideFormData) => Promise<void>;
    isSubmitting?: boolean;
}

export default function HeroSlideForm({ mode, initialData, onSubmit, isSubmitting = false }: HeroSlideFormProps) {
    const router = useRouter();
    const { slug } = useSlug();
    const { openAlertModal } = useModalStore();

    // useState의 초기값으로 initialData 사용 (컴포넌트 마운트 시에만 적용)
    const [formData, setFormData] = useState<HeroSlideFormData>(() => ({
        image_url: initialData?.image_url || '',
        link_url: initialData?.link_url || '',
        display_order: initialData?.display_order ?? 0,
        is_active: initialData?.is_active ?? true,
    }));
    const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(() => initialData?.image_url || null);

    // 이미지 업로드 Hook 사용
    const {
        imageInfo,
        uploadedUrl,
        isLoading: isImageLoading,
        isUploading,
        uploadImage,
    } = useImageUpload({
        imageType: 'hero_slide',
        storagePath: `unions/${slug}/hero-slides`,
        useHighRes: false,
        onError: (error) => {
            openAlertModal({
                title: '이미지 오류',
                message: error,
                type: 'error',
            });
        },
    });

    const isReadOnly = mode === 'view';

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
        }));
    }, []);

    const handleImageChange = useCallback((url: string | null) => {
        setPendingImageUrl(url);
        if (!url) {
            setFormData((prev) => ({ ...prev, image_url: '' }));
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly || !onSubmit) return;

        // 이미지 필수 검증: imageInfo가 있거나, pendingImageUrl이 있거나, formData.image_url이 있어야 함
        const hasImage = imageInfo || pendingImageUrl || formData.image_url;
        if (!hasImage) {
            openAlertModal({
                title: '입력 오류',
                message: '슬라이드 이미지를 등록해주세요.',
                type: 'error',
            });
            return;
        }

        try {
            let imageUrl = formData.image_url;

            // 새로 선택한 이미지가 있고, 아직 업로드되지 않았다면 업로드
            if (imageInfo && !uploadedUrl) {
                const newUrl = await uploadImage();
                if (newUrl) {
                    imageUrl = newUrl;
                } else {
                    openAlertModal({
                        title: '업로드 오류',
                        message: '이미지 업로드에 실패했습니다.',
                        type: 'error',
                    });
                    return;
                }
            } else if (uploadedUrl) {
                imageUrl = uploadedUrl;
            } else if (pendingImageUrl && pendingImageUrl.startsWith('http')) {
                // 기존 이미지 URL 유지
                imageUrl = pendingImageUrl;
            }

            await onSubmit({ ...formData, image_url: imageUrl });
        } catch (error) {
            console.error('Submit error:', error);
        }
    };

    const getTitle = () => {
        switch (mode) {
            case 'create':
                return '슬라이드 등록';
            case 'edit':
                return '슬라이드 수정';
            case 'view':
                return '슬라이드 상세';
        }
    };

    return (
        <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
            <div className="max-w-4xl mx-auto">
                {/* 페이지 제목 - 디자인 시스템 스타일 적용 */}
                <h2 className="text-[32px] font-bold text-[#5FA37C] mb-8">{getTitle()}</h2>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* 슬라이드 이미지 업로드 */}
                    <ImageUploader
                        imageType="hero_slide"
                        storagePath={`unions/${slug}/hero-slides`}
                        label="슬라이드 이미지"
                        required
                        disabled={isReadOnly}
                        initialImageUrl={initialData?.image_url || undefined}
                        onImageChange={handleImageChange}
                        previewHeight="h-[300px]"
                    />

                    {/* 링크 URL */}
                    <div className="space-y-2">
                        <Label htmlFor="link_url" className="text-[16px] font-bold text-[#5FA37C]">
                            링크 URL
                        </Label>
                        <Input
                            id="link_url"
                            name="link_url"
                            type="url"
                            value={formData.link_url}
                            onChange={handleChange}
                            placeholder="https://example.com (클릭 시 이동할 URL)"
                            disabled={isReadOnly}
                            autoComplete="url"
                            inputMode="url"
                            spellCheck={false}
                            className={cn(
                                'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                'bg-white'
                            )}
                        />
                        <p className="text-xs text-gray-500">
                            슬라이드 클릭 시 이동할 URL을 입력하세요. 비워두면 클릭해도 이동하지 않습니다.
                        </p>
                    </div>

                    {/* 표시 순서 */}
                    <div className="space-y-2">
                        <Label htmlFor="display_order" className="text-[16px] font-bold text-[#5FA37C]">
                            표시 순서
                        </Label>
                        <Input
                            id="display_order"
                            name="display_order"
                            type="number"
                            min="0"
                            value={formData.display_order}
                            onChange={handleChange}
                            placeholder="0"
                            disabled={isReadOnly}
                            autoComplete="off"
                            inputMode="numeric"
                            className={cn(
                                'w-32 h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                'bg-white',
                                // 스피너 화살표 제거
                                '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                            )}
                        />
                        <p className="text-xs text-gray-500">숫자가 작을수록 먼저 표시됩니다. (0이 가장 먼저)</p>
                    </div>

                    {/* 활성화 상태 */}
                    <div className="flex items-center justify-between p-4 bg-white rounded-[12px] border border-[#CCCCCC]">
                        <div>
                            <Label htmlFor="is_active" className="text-[16px] font-bold text-[#5FA37C]">
                                슬라이드 활성화
                            </Label>
                            <p className="text-sm text-gray-500">비활성화하면 홈페이지에 표시되지 않습니다</p>
                        </div>
                        {isReadOnly ? (
                            <div
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    formData.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                                }`}
                            >
                                {formData.is_active ? '활성' : '비활성'}
                            </div>
                        ) : (
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                            />
                        )}
                    </div>

                    {/* 버튼 영역 - ActionButton 위젯 사용 */}
                    {!isReadOnly && (
                        <div className="flex justify-end gap-3 pt-6 border-t border-[#CCCCCC]">
                            <ActionButton buttonType="cancel" onClick={() => router.back()}>
                                취소
                            </ActionButton>
                            <ActionButton
                                buttonType="submit"
                                type="submit"
                                isLoading={isSubmitting || isUploading || isImageLoading}
                            >
                                {mode === 'create' ? '등록' : '수정 완료'}
                            </ActionButton>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
