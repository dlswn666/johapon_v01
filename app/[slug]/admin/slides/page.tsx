'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAllHeroSlides, useDeleteHeroSlide } from '@/app/_lib/features/hero-slides/api/useHeroSlidesHook';
import { HeroSlideList } from '@/app/_lib/features/hero-slides/ui';
import { HeroSlide } from '@/app/_lib/shared/type/database.types';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

export default function SlidesPage() {
    const router = useRouter();
    const { union, slug, isLoading: isUnionLoading } = useSlug();
    const { isAdmin, isLoading: isAuthLoading } = useAuth();
    const { openConfirmModal, openAlertModal } = useModalStore();

    const { data: slides, isLoading: isSlidesLoading } = useAllHeroSlides(union?.id);
    const deleteMutation = useDeleteHeroSlide();

    // 권한 체크
    useEffect(() => {
        if (!isAuthLoading && !isAdmin) {
            router.push(`/${slug}`);
        }
    }, [isAuthLoading, isAdmin, router, slug]);

    const handleDelete = (slide: HeroSlide) => {
        openConfirmModal({
            title: '슬라이드 삭제',
            message: '이 슬라이드를 삭제하시겠습니까?\n삭제된 슬라이드는 복구할 수 없습니다.',
            confirmText: '삭제',
            cancelText: '취소',
            variant: 'danger',
            onConfirm: () => handleConfirmDelete(slide.id),
        });
    };

    const handleConfirmDelete = async (slideId: string) => {
        try {
            await deleteMutation.mutateAsync(slideId);
            openAlertModal({
                title: '삭제 완료',
                message: '슬라이드가 성공적으로 삭제되었습니다.',
                type: 'success',
            });
        } catch (error) {
            console.error('Delete error:', error);
            openAlertModal({
                title: '삭제 실패',
                message: '슬라이드 삭제 중 오류가 발생했습니다.',
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
        <div className="container mx-auto px-4 py-8 space-y-6">
            {/* 페이지 타이틀 */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">슬라이드 관리</h1>
                <p className="mt-1 text-sm text-gray-500">
                    홈페이지 상단에 표시되는 슬라이드 이미지를 관리합니다
                </p>
            </div>

            {/* 슬라이드 리스트 */}
            <HeroSlideList
                slides={slides ?? []}
                isLoading={isSlidesLoading}
                onDelete={handleDelete}
            />
        </div>
    );
}

