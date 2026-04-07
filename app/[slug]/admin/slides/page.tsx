'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAllHeroSlides, useDeleteHeroSlide } from '@/app/_lib/features/hero-slides/api/useHeroSlidesHook';
import { HeroSlideList } from '@/app/_lib/features/hero-slides/ui';
import { HeroSlide } from '@/app/_lib/shared/type/database.types';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { toast } from 'react-hot-toast';

export default function SlidesPage() {
    const router = useRouter();
    const { union, slug, isLoading: isUnionLoading } = useSlug();
    const { isAdmin, isLoading: isAuthLoading } = useAuth();
    const { openConfirmModal } = useModalStore();

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
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    // 로딩 중
    if (isUnionLoading || isAuthLoading) {
        return (
            <div className="space-y-3">
                {/* 헤더 */}
                <div className="flex items-baseline gap-3">
                    <Skeleton className="h-8 w-36" />
                    <Skeleton className="h-4 w-64" style={{ animationDelay: '50ms' }} />
                </div>

                {/* 슬라이드 카드 그리드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                            <Skeleton className="h-40 w-full rounded-none" style={{ animationDelay: `${100 + i * 80}ms` }} />
                            <div className="p-4 space-y-2">
                                <Skeleton className="h-4 w-3/4" style={{ animationDelay: `${150 + i * 80}ms` }} />
                                <Skeleton className="h-3 w-1/2" style={{ animationDelay: `${180 + i * 80}ms` }} />
                            </div>
                        </div>
                    ))}
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
        <div className="space-y-3">
            {/* 페이지 타이틀 */}
            <div className="flex items-baseline gap-3">
                <h1 className="text-2xl font-bold text-gray-900">슬라이드 관리</h1>
                <p className="text-sm text-gray-400">홈페이지 상단에 표시되는 슬라이드 이미지를 관리합니다</p>
            </div>

            {/* 슬라이드 리스트 */}
            <HeroSlideList slides={slides ?? []} isLoading={isSlidesLoading} onDelete={handleDelete} />
        </div>
    );
}
