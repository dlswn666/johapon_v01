'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Link as LinkIcon, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeroSlide } from '@/app/_lib/shared/type/database.types';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { ImageUploader } from '@/app/_lib/shared/ui/ImageUploader';
import { useImageUpload } from '@/app/_lib/shared/hooks/image/useImageUpload';

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

        // 이미지 필수 검증
        if (!pendingImageUrl && !formData.image_url) {
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
        <Card className="shadow-lg max-w-3xl mx-auto">
            <CardHeader className="border-b bg-gray-50/50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <CardTitle className="text-xl font-semibold">{getTitle()}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 슬라이드 이미지 업로드 - 새로운 ImageUploader 사용 */}
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
                        <Label htmlFor="link_url" className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            링크 URL
                        </Label>
                        <Input
                            id="link_url"
                            name="link_url"
                            value={formData.link_url}
                            onChange={handleChange}
                            placeholder="https://example.com (클릭 시 이동할 URL)"
                            disabled={isReadOnly}
                        />
                        <p className="text-xs text-gray-500">
                            슬라이드 클릭 시 이동할 URL을 입력하세요. 비워두면 클릭해도 이동하지 않습니다.
                        </p>
                    </div>

                    {/* 표시 순서 */}
                    <div className="space-y-2">
                        <Label htmlFor="display_order" className="flex items-center gap-2">
                            <Hash className="w-4 h-4" />
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
                            className="w-32"
                        />
                        <p className="text-xs text-gray-500">숫자가 작을수록 먼저 표시됩니다. (0이 가장 먼저)</p>
                    </div>

                    {/* 활성화 상태 */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <Label htmlFor="is_active" className="text-base font-medium">
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

                    {/* 버튼 영역 */}
                    {!isReadOnly && (
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                취소
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || isUploading || isImageLoading}
                                className="bg-[#4E8C6D] hover:bg-[#3d7359]"
                            >
                                {(isSubmitting || isUploading || isImageLoading) && (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                )}
                                {mode === 'create' ? '등록' : '수정 완료'}
                            </Button>
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
