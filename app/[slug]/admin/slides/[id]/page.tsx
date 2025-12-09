'use client';

import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useHeroSlide, useDeleteHeroSlide } from '@/app/_lib/features/hero-slides/api/useHeroSlidesHook';
import { HeroSlideForm } from '@/app/_lib/features/hero-slides/ui';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

interface SlideDetailPageProps {
    params: Promise<{ slug: string; id: string }>;
}

export default function SlideDetailPage({ params }: SlideDetailPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { slug } = useSlug();
    const { isAdmin, isLoading: isAuthLoading } = useAuth();
    const { data: slide, isLoading, error } = useHeroSlide(id);
    const deleteMutation = useDeleteHeroSlide();
    const { openConfirmModal, openAlertModal } = useModalStore();

    // 권한 체크
    useEffect(() => {
        if (!isAuthLoading && !isAdmin) {
            router.push(`/${slug}`);
        }
    }, [isAuthLoading, isAdmin, router, slug]);

    const handleEdit = () => {
        router.push(`/${slug}/admin/slides/${id}/edit`);
    };

    const handleDeleteClick = () => {
        openConfirmModal({
            title: '슬라이드 삭제',
            message: '이 슬라이드를 삭제하시겠습니까?\n삭제된 슬라이드는 복구할 수 없습니다.',
            confirmText: '삭제',
            cancelText: '취소',
            variant: 'danger',
            onConfirm: handleConfirmDelete,
        });
    };

    const handleConfirmDelete = async () => {
        try {
            await deleteMutation.mutateAsync(id);
            openAlertModal({
                title: '삭제 완료',
                message: '슬라이드가 성공적으로 삭제되었습니다.',
                type: 'success',
                onOk: () => router.push(`/${slug}/admin/slides`),
            });
        } catch (error) {
            console.error('Delete slide error:', error);
            openAlertModal({
                title: '삭제 실패',
                message: '슬라이드 삭제 중 오류가 발생했습니다.',
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
        <div className="container mx-auto px-4 py-8 space-y-6">
            {/* 액션 버튼 */}
            <Card className="shadow-lg max-w-3xl mx-auto">
                <CardHeader className="border-b bg-gray-50/50 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">관리</h2>
                            <p className="text-sm text-gray-500">
                                슬라이드를 수정하거나 삭제할 수 있습니다
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleEdit} className="gap-2">
                                <Edit className="w-4 h-4" />
                                수정
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteClick}
                                className="gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                삭제
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* 슬라이드 정보 폼 (읽기 전용) */}
            <HeroSlideForm mode="view" initialData={slide} />
        </div>
    );
}

