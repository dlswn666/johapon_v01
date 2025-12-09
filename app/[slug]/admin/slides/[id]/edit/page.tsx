'use client';

import React, { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useHeroSlide, useUpdateHeroSlide } from '@/app/_lib/features/hero-slides/api/useHeroSlidesHook';
import { HeroSlideForm } from '@/app/_lib/features/hero-slides/ui';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

interface SlideEditPageProps {
    params: Promise<{ slug: string; id: string }>;
}

interface FormData {
    image_url: string;
    link_url: string;
    display_order: number;
    is_active: boolean;
}

export default function SlideEditPage({ params }: SlideEditPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { slug } = useSlug();
    const { isAdmin, isLoading: isAuthLoading } = useAuth();
    const { data: slide, isLoading, error } = useHeroSlide(id);
    const updateMutation = useUpdateHeroSlide();
    const { openConfirmModal, openAlertModal } = useModalStore();
    const [pendingData, setPendingData] = useState<FormData | null>(null);

    // 권한 체크
    useEffect(() => {
        if (!isAuthLoading && !isAdmin) {
            router.push(`/${slug}`);
        }
    }, [isAuthLoading, isAdmin, router, slug]);

    const handleSubmit = async (data: FormData) => {
        setPendingData(data);
        openConfirmModal({
            title: '슬라이드 수정',
            message: '슬라이드 정보를 수정하시겠습니까?',
            confirmText: '수정',
            cancelText: '취소',
            variant: 'default',
            onConfirm: () => handleConfirmUpdate(data),
        });
    };

    const handleConfirmUpdate = async (data: FormData) => {
        try {
            await updateMutation.mutateAsync({
                id,
                updates: {
                    image_url: data.image_url,
                    link_url: data.link_url || null,
                    display_order: data.display_order,
                    is_active: data.is_active,
                },
            });

            openAlertModal({
                title: '수정 완료',
                message: '슬라이드가 성공적으로 수정되었습니다.',
                type: 'success',
                onOk: () => router.push(`/${slug}/admin/slides/${id}`),
            });
        } catch (error) {
            console.error('Update slide error:', error);
            openAlertModal({
                title: '수정 실패',
                message: '슬라이드 수정 중 오류가 발생했습니다.',
                type: 'error',
            });
        }
    };

    if (isLoading || isAuthLoading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-[#4E8C6D]" />
                    <p className="text-lg text-gray-600">슬라이드 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-xl font-semibold text-gray-700">접근 권한이 없습니다</p>
                    <p className="text-gray-500">관리자만 접근할 수 있습니다</p>
                </div>
            </div>
        );
    }

    if (error || !slide) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-xl font-semibold text-gray-700">
                        슬라이드를 찾을 수 없습니다
                    </p>
                    <Button onClick={() => router.push(`/${slug}/admin/slides`)}>
                        목록으로 돌아가기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <HeroSlideForm
                mode="edit"
                initialData={slide}
                onSubmit={handleSubmit}
                isSubmitting={updateMutation.isPending}
            />
        </div>
    );
}

