'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useHeroSlides } from '@/app/_lib/features/hero-slides/api/useHeroSlidesHook';
import { HeroSlider } from '@/app/_lib/widgets/hero-slider';
import { UnionInfoFooter } from '@/app/_lib/widgets/union-info-footer';
import { UnionNewsSection } from '@/app/_lib/widgets/union-news-section';

export default function UnionHomePage() {
    const { union, isLoading: isUnionLoading } = useSlug();
    const { data: heroSlides, isLoading: isSlidesLoading } = useHeroSlides(union?.id);

    if (isUnionLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <p className="text-lg text-gray-600">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (!union) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-4">
                    <p className="text-xl font-semibold text-gray-700">조합 정보를 찾을 수 없습니다</p>
                    <p className="text-gray-500">URL을 확인해주세요</p>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Hero Section - 슬라이드 */}
            <section className="relative">
                {isSlidesLoading ? (
                    <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] bg-gray-200 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <HeroSlider
                        slides={heroSlides || []}
                        autoPlayInterval={4000}
                        title={union.name}
                        description="우리 조합의 모든 정보, 이제는 한 곳에서 간편하게 확인하세요."
                    />
                )}
            </section>

            {/* 조합 소식 섹션 */}
            {union.id && <UnionNewsSection unionId={union.id} />}

            {/* Spacer */}
            <div className="flex-grow" />

            {/* Footer - 조합 정보 */}
            <UnionInfoFooter union={union} />
        </div>
    );
}
