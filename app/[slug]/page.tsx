'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useHeroSlides } from '@/app/_lib/features/hero-slides/api/useHeroSlidesHook';
import { usePopupNotices } from '@/app/_lib/features/notice/api/useNoticeHook';
import { HeroSlider } from '@/app/_lib/widgets/hero-slider';
import { UnionNewsSection } from '@/app/_lib/widgets/union-news-section';
import { NoticePopup } from '@/app/_lib/widgets/notice-popup';
import { LandingPage } from '@/app/_lib/widgets/landing';

export default function UnionHomePage() {
    const { union, isLoading: isUnionLoading } = useSlug();
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const { data: heroSlides, isLoading: isSlidesLoading } = useHeroSlides(union?.id);
    const { data: popupNotices } = usePopupNotices(union?.id);
    
    // 로그인 성공 후 홈페이지로 전환하기 위한 상태
    const [forceShowHome, setForceShowHome] = useState(false);

    // 로딩 중
    if (isUnionLoading || isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-[#4E8C6D]" />
                    <p className="text-lg text-gray-600">로딩 중...</p>
                </div>
            </div>
        );
    }

    // 조합 정보 없음
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

    // 비로그인 상태: 랜딩 페이지 표시
    if (!isAuthenticated && !forceShowHome) {
        return (
            <LandingPage
                unionName={union.name}
                onLoginSuccess={() => setForceShowHome(true)}
            />
        );
    }

    // 로그인 상태 또는 테스트 로그인 후: 기존 홈페이지 표시
    return (
        <>
            {/* Hero Section - 슬라이드 */}
            <section className="relative">
                {isSlidesLoading ? (
                    <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] bg-gray-200 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <HeroSlider slides={heroSlides || []} autoPlayInterval={4000} title={union.name} description="" />
                )}
            </section>

            {/* 조합 소식 섹션 */}
            {union.id && <UnionNewsSection unionId={union.id} />}

            {/* 팝업 공지사항 */}
            {popupNotices?.map((notice, index) => (
                <NoticePopup key={notice.id} notice={notice} unionName={union.name} offsetIndex={index} />
            ))}
        </>
    );
}
