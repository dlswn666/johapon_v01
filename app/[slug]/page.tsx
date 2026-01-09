'use client';

import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useHeroSlides } from '@/app/_lib/features/hero-slides/api/useHeroSlidesHook';
import { usePopupNotices } from '@/app/_lib/features/notice/api/useNoticeHook';
import { HeroSlider } from '@/app/_lib/widgets/hero-slider';
import { NoticePopup } from '@/app/_lib/widgets/notice-popup';
import { LandingPage } from '@/app/_lib/widgets/landing';
import { UserStatusModal } from '@/app/_lib/widgets/modal';
import { SideAdWidget } from '@/app/_lib/features/advertisement/ui/SideAdWidget';
import { HomeBannerWidget } from '@/app/_lib/features/advertisement/ui/HomeBannerWidget';
import { HomeBoardSection, HomeCommunitySection, HomeInfoSection, HomeUnionCard } from '@/app/_lib/widgets/home';

export default function UnionHomePage() {
    const { union, isLoading: isUnionLoading } = useSlug();
    const { isAuthenticated, isLoading: isAuthLoading, isUserFetching, authUser, user } = useAuth();
    const { data: heroSlides, isLoading: isSlidesLoading } = useHeroSlides(union?.id);
    const { data: popupNotices } = usePopupNotices(union?.id);

    // 로그인 성공 후 홈페이지로 전환하기 위한 상태
    const [forceShowHome, setForceShowHome] = useState(false);

    // 신규 사용자: authUser는 있지만 user가 없는 경우 (회원가입 필요)
    const needsRegistration = !!authUser && !user;

    // [DEBUG] 조합 페이지 렌더링 상태
    console.log('[DEBUG] 🏠 UnionHomePage 렌더링');
    console.log('[DEBUG] 상태:', {
        isUnionLoading,
        isAuthLoading,
        isAuthenticated,
        authUser: authUser ? { id: authUser.id, email: authUser.email } : 'null',
        user: user ? { id: user.id, name: user.name, role: user.role } : 'null',
        needsRegistration,
        forceShowHome,
        unionSlug: union?.slug || 'null',
    });

    if (isUnionLoading || isAuthLoading || isUserFetching) {
        console.log('[DEBUG] ⏳ Loading...', { isUnionLoading, isAuthLoading, isUserFetching });
        return (
            <div className="container mx-auto max-w-[1280px] px-4 py-8">
                <Skeleton className="w-full h-[600px] rounded-[24px]" />
            </div>
        );
    }

    // 조합 정보 없음
    if (!union) {
        console.log('[DEBUG] ❌ 조합 정보 없음');
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-4">
                    <p className="text-xl font-semibold text-gray-700">조합 정보를 찾을 수 없습니다</p>
                    <p className="text-gray-500">URL을 확인해주세요</p>
                </div>
            </div>
        );
    }

    // 비로그인 상태 또는 회원가입이 필요한 신규 사용자: 랜딩 페이지 표시
    // needsRegistration: authUser는 있지만 user가 없는 경우 (회원가입 모달 표시 필요)
    const showLandingPage = (!isAuthenticated || needsRegistration) && !forceShowHome;
    console.log('[DEBUG] 랜딩 페이지 표시 조건:', {
        '!isAuthenticated': !isAuthenticated,
        needsRegistration,
        forceShowHome,
        showLandingPage,
    });

    if (showLandingPage) {
        console.log('[DEBUG] 👉 LandingPage 렌더링 (회원가입 모달 포함)');
        return <LandingPage unionName={union.name} onLoginSuccess={() => setForceShowHome(true)} />;
    }

    console.log('[DEBUG] 👉 홈페이지 렌더링 (로그인 완료)');

    // 로그인 상태: 새로운 홈페이지 레이아웃
    return (
        <>
            {/* Hero Section - 슬라이드 (전체 너비) */}
            <section className="relative">
                {isSlidesLoading ? (
                    <Skeleton className="w-full h-[400px] md:h-[500px] lg:h-[600px] rounded-none" />
                ) : (
                    <HeroSlider slides={heroSlides || []} autoPlayInterval={4000} />
                )}
            </section>

            {/* 메인 컨텐츠 섹션: 광고 | 컨텐츠 | 광고 3열 구조 */}
            <section className="py-[24px] md:py-[79px]">
                <div className="flex gap-[42px] justify-center px-[16px] md:px-4">
                    {/* 좌측 광고 - 1440px 이상에서만 표시 */}
                    <aside className="hidden min-[1440px]:block w-[265px] shrink-0">
                        <div className="sticky top-[100px] h-[404px] rounded-[16px] overflow-hidden">
                            <SideAdWidget />
                        </div>
                    </aside>

                    {/* 중앙 메인 컨텐츠 */}
                    <div className="w-full max-w-[1200px] flex flex-col gap-[20px] md:gap-[47px]">
                        {/* 게시판 섹션 */}
                        <HomeBoardSection />

                        {/* 모바일: 배너 광고 2열 그리드 */}
                        <div className="block md:hidden">
                            <HomeBannerWidget />
                        </div>

                        {/* 모바일: 커뮤니티 + 조합정보 2열 그리드 */}
                        <div className="grid grid-cols-2 md:hidden gap-[8px]">
                            <HomeCommunitySection />
                            <HomeUnionCard />
                        </div>

                        {/* PC: 재개발 커뮤니티 + 재개발 정보 (같은 행) */}
                        <div className="hidden md:flex gap-[22px]">
                            <div className="w-[282px] shrink-0">
                                <HomeCommunitySection />
                            </div>
                            <div className="flex-1">
                                <HomeInfoSection />
                            </div>
                        </div>

                        {/* 모바일: 재개발 정보 별도 행 */}
                        <div className="block md:hidden">
                            <HomeInfoSection />
                        </div>

                        {/* PC: 조합 정보 카드 */}
                        <div className="hidden md:block">
                            <HomeUnionCard />
                        </div>
                    </div>

                    {/* 우측 광고 - 1440px 이상에서만 표시 */}
                    <aside className="hidden min-[1440px]:block w-[265px] shrink-0">
                        <div className="sticky top-[100px] h-[404px] rounded-[16px] overflow-hidden">
                            <SideAdWidget />
                        </div>
                    </aside>
                </div>
            </section>

            {/* 팝업 공지사항 */}
            {popupNotices?.map((notice, index) => (
                <NoticePopup key={notice.id} notice={notice} unionName={union.name} offsetIndex={index} />
            ))}

            {/* 사용자 상태 모달 (승인 대기, 승인 거부) */}
            <UserStatusModal />
        </>
    );
}
