'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Upload, X, Loader2, Link as LinkIcon, Hash, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeroSlide } from '@/app/_lib/shared/type/database.types';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

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

export default function HeroSlideForm({
    mode,
    initialData,
    onSubmit,
    isSubmitting = false,
}: HeroSlideFormProps) {
    const router = useRouter();
    const { slug } = useSlug();
    const [formData, setFormData] = useState<HeroSlideFormData>({
        image_url: '',
        link_url: '',
        display_order: 0,
        is_active: true,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const isReadOnly = mode === 'view';

    useEffect(() => {
        if (initialData) {
            setFormData({
                image_url: initialData.image_url || '',
                link_url: initialData.link_url || '',
                display_order: initialData.display_order ?? 0,
                is_active: initialData.is_active ?? true,
            });
            if (initialData.image_url) {
                setImagePreview(initialData.image_url);
            }
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
        }));
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 파일 크기 제한 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('이미지 크기는 5MB를 초과할 수 없습니다.');
            return;
        }

        // 미리보기 생성
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        setImageFile(file);
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setFormData((prev) => ({ ...prev, image_url: '' }));
    };

    const uploadImage = async (): Promise<string | null> => {
        if (!imageFile) return formData.image_url || null;

        setIsUploading(true);
        try {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `hero-slides/${slug}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('files')
                .upload(fileName, imageFile);

            if (uploadError) throw uploadError;

            const {
                data: { publicUrl },
            } = supabase.storage.from('files').getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error('Image upload error:', error);
            throw error;
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly || !onSubmit) return;

        // 이미지 필수 검증
        if (!imagePreview && !formData.image_url) {
            alert('슬라이드 이미지를 등록해주세요.');
            return;
        }

        try {
            let imageUrl = formData.image_url;
            if (imageFile) {
                imageUrl = (await uploadImage()) || '';
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
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="hover:bg-gray-200"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <CardTitle className="text-xl font-semibold">{getTitle()}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 슬라이드 이미지 업로드 */}
                    <div className="space-y-2">
                        <Label>
                            슬라이드 이미지 <span className="text-red-500">*</span>
                        </Label>
                        <div className="space-y-4">
                            {imagePreview ? (
                                <div className="relative w-full h-[300px]">
                                    <Image
                                        src={imagePreview}
                                        alt="슬라이드 미리보기"
                                        fill
                                        className="rounded-lg object-cover border"
                                    />
                                    {!isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full h-[200px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-gray-50">
                                    <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">이미지를 업로드해주세요</p>
                                    <p className="text-xs text-gray-400 mt-1">권장: 1920x600px, PNG/JPG</p>
                                </div>
                            )}
                            {!isReadOnly && (
                                <div>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        id="slide-image-upload"
                                    />
                                    <Label
                                        htmlFor="slide-image-upload"
                                        className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        이미지 선택
                                    </Label>
                                </div>
                            )}
                        </div>
                    </div>

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
                        <p className="text-xs text-gray-500">
                            숫자가 작을수록 먼저 표시됩니다. (0이 가장 먼저)
                        </p>
                    </div>

                    {/* 활성화 상태 */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <Label htmlFor="is_active" className="text-base font-medium">
                                슬라이드 활성화
                            </Label>
                            <p className="text-sm text-gray-500">
                                비활성화하면 홈페이지에 표시되지 않습니다
                            </p>
                        </div>
                        {isReadOnly ? (
                            <div
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    formData.is_active
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-gray-200 text-gray-600'
                                }`}
                            >
                                {formData.is_active ? '활성' : '비활성'}
                            </div>
                        ) : (
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) =>
                                    setFormData((prev) => ({ ...prev, is_active: checked }))
                                }
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
                                disabled={isSubmitting || isUploading}
                                className="bg-[#4E8C6D] hover:bg-[#3d7359]"
                            >
                                {(isSubmitting || isUploading) && (
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

