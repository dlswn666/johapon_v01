'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useCreateHeroSlide } from '@/app/_lib/features/hero-slides/api/useHeroSlidesHook';
import { HeroSlideForm } from '@/app/_lib/features/hero-slides/ui';

export default function NewSlidePage() {
    const router = useRouter();
    const { union, slug, isLoading: isUnionLoading } = useSlug();
    const { isAdmin, isLoading: isAuthLoading } = useAuth();
    const createMutation = useCreateHeroSlide();

    // 권한 체크
    useEffect(() => {
        if (!isAuthLoading && !isAdmin) {
            router.push(`/${slug}`);
        }
    }, [isAuthLoading, isAdmin, router, slug]);

    const handleSubmit = async (data: {
        image_url: string;
        link_url: string;
        display_order: number;
        is_active: boolean;
    }) => {
        if (!union?.id) {
            throw new Error('조합 정보를 찾을 수 없습니다.');
        }

        try {
            const result = await createMutation.mutateAsync({
                union_id: union.id,
                image_url: data.image_url,
                link_url: data.link_url || null,
                display_order: data.display_order,
                is_active: data.is_active,
            });

            router.push(`/${slug}/admin/slides/${result.id}`);
        } catch (error) {
            console.error('Create slide error:', error);
            throw error;
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

