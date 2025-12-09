'use client';

import React, { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useHeroSlide, useUpdateHeroSlide } from '@/app/_lib/features/hero-slides/api/useHeroSlidesHook';
import { HeroSlideForm } from '@/app/_lib/features/hero-slides/ui';

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
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingData, setPendingData] = useState<FormData | null>(null);

    // 권한 체크
    useEffect(() => {
        if (!isAuthLoading && !isAdmin) {
            router.push(`/${slug}`);
        }
    }, [isAuthLoading, isAdmin, router, slug]);

    const handleSubmit = async (data: FormData) => {
        setPendingData(data);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmUpdate = async () => {
        if (!pendingData) return;

        try {
            await updateMutation.mutateAsync({
                id,
                updates: {
                    image_url: pendingData.image_url,
                    link_url: pendingData.link_url || null,
                    display_order: pendingData.display_order,
                    is_active: pendingData.is_active,
                },
            });

            setIsConfirmModalOpen(false);
            router.push(`/${slug}/admin/slides/${id}`);
        } catch (error) {
            console.error('Update slide error:', error);
            setIsConfirmModalOpen(false);
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

            {/* 수정 확인 모달 */}
            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>슬라이드 수정 확인</DialogTitle>
                        <DialogDescription>
                            슬라이드 정보를 수정하시겠습니까?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsConfirmModalOpen(false)}
                            disabled={updateMutation.isPending}
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleConfirmUpdate}
                            disabled={updateMutation.isPending}
                            className="bg-[#4E8C6D] hover:bg-[#3d7359]"
                        >
                            {updateMutation.isPending && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            수정
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

