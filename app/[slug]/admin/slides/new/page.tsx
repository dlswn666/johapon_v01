'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useCreateHeroSlide } from '@/app/_lib/features/hero-slides/api/useHeroSlidesHook';
import { HeroSlideForm } from '@/app/_lib/features/hero-slides/ui';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

interface FormData {
    image_url: string;
    link_url: string;
    display_order: number;
    is_active: boolean;
}

export default function NewSlidePage() {
    const router = useRouter();
    const { union, slug, isLoading: isUnionLoading } = useSlug();
    const { isAdmin, isLoading: isAuthLoading } = useAuth();
    const createMutation = useCreateHeroSlide();
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
            title: '슬라이드 등록',
            message: '새로운 슬라이드를 등록하시겠습니까?',
            confirmText: '등록',
            cancelText: '취소',
            variant: 'default',
            onConfirm: () => handleConfirmCreate(data),
        });
    };

    const handleConfirmCreate = async (data: FormData) => {
        if (!union?.id) {
            openAlertModal({
                title: '오류',
                message: '조합 정보를 찾을 수 없습니다.',
                type: 'error',
            });
            return;
        }

        try {
            const result = await createMutation.mutateAsync({
                union_id: union.id,
                image_url: data.image_url,
                link_url: data.link_url || null,
                display_order: data.display_order,
                is_active: data.is_active,
            });

            openAlertModal({
                title: '등록 완료',
                message: '슬라이드가 성공적으로 등록되었습니다.',
                type: 'success',
                onOk: () => router.push(`/${slug}/admin/slides/${result.id}`),
            });
        } catch (error) {
            console.error('Create slide error:', error);
            openAlertModal({
                title: '등록 실패',
                message: '슬라이드 등록 중 오류가 발생했습니다.',
                type: 'error',
            });
        }
    };

    // 로딩 중
    if (isUnionLoading || isAuthLoading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-[#4E8C6D]" />
                    <p className="text-lg text-gray-600">로딩 중...</p>
                </div>
            </div>
        );
    }

    // 권한 없음
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

    return (
        <div className="container mx-auto px-4 py-8">
            <HeroSlideForm
                mode="create"
                onSubmit={handleSubmit}
                isSubmitting={createMutation.isPending}
            />
        </div>
    );
}

