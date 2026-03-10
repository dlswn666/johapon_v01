'use client';

import React, { useState, useMemo } from 'react';
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
import { HomeBoardSection, HomeCommunitySection, HomeInfoSection, HomePartnerships } from '@/app/_lib/widgets/home';

export default function UnionHomePage() {
    const { union, isLoading: isUnionLoading } = useSlug();
    const { isAuthenticated, isLoading: isAuthLoading, isUserFetching, authUser, user } = useAuth();
    const { data: heroSlides, isLoading: isSlidesLoading } = useHeroSlides(union?.id);
    const { data: popupNotices } = usePopupNotices(union?.id);

    // 로그인 성공 후 홈페이지로 전환하기 위한 상태
    const [forceShowHome, setForceShowHome] = useState(false);

    // 신규 사용자: authUser는 있지만 user가 없는 경우 (회원가입 필요)
    const needsRegistration = !!authUser && !user;

    // 커뮤니티 링크 존재 여부 (PC 레이아웃 결정용)
    const hasCommunityLinks = useMemo(() => {
        const links = union?.community_links as Array<{ platform: string; active: boolean }> | null;
        return links?.some((l) => l.active && (l.platform === 'naver_cafe' || l.platform === 'youtube')) ?? false;
    }, [union?.community_links]);

    if (isUnionLoading || isAuthLoading || isUserFetching) {
        return (
            <div className="container mx-auto max-w-[1280px] px-4 py-8">
                <Skeleton className="w-full h-[600px] rounded-[24px]" />
                <p className="text-center text-gray-400 mt-4">로딩 중...</p>
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

    // 비로그인 상태 또는 회원가입이 필요한 신규 사용자: 랜딩 페이지 표시
    // needsRegistration: authUser는 있지만 user가 없는 경우 (회원가입 모달 표시 필요)
    const showLandingPage = (!isAuthenticated || needsRegistration) && !forceShowHome;

    if (showLandingPage) {
        return <LandingPage unionName={union.name} onLoginSuccess={() => setForceShowHome(true)} />;
    }

    // 로그인 상태: 새로운 홈페이지 레이아웃
    return (
        <>
            {/* Hero Section - max-w-[1920px]로 너비 제한 */}
            <section className="relative max-w-[1920px] mx-auto px-[16px] lg:px-0">
                <div className="w-full h-[376px] md:h-[400px] lg:h-[500px] xl:h-[700px] rounded-[8px] lg:rounded-none overflow-hidden">
                    {isSlidesLoading ? (
                        <Skeleton className="w-full h-full" />
                    ) : (
                        <HeroSlider slides={heroSlides || []} autoPlayInterval={4000} />
                    )}
                </div>
            </section>

            {/* 메인 컨텐츠 섹션 - Figma: 3열 레이아웃 (좌측광고 | 메인컨텐츠 | 우측광고) */}
            <section className="py-[12px] md:py-[30px]">
                <div className="max-w-[1920px] mx-auto px-[16px] md:px-[24px]">
                    <div className="flex gap-[24px] lg:gap-[32px] xl:gap-[42px] items-start justify-center">
                        {/* 좌측 광고 - 소형 데스크톱 이상에서 표시 */}
                        <aside className="hidden lg:block lg:w-[200px] xl:w-[279px] shrink-0">
                            <SideAdWidget />
                        </aside>

                        {/* 중앙 메인 컨텐츠 */}
                        <div className="w-full min-w-0 flex-1 max-w-[1200px] flex flex-col gap-[20px] md:gap-[30px]">
                            {/* 태블릿 전용: 광고 배너 ① (히어로 아래 풀너비) — md(768px)~lg(1100px) 미만에서만 표시 */}
                            <div className="hidden md:block lg:hidden">
                                <HomeBannerWidget variant="tablet-full" />
                            </div>

                            {/* 모바일: 광고 배너 ① (히어로 아래) */}
                            <div className="block md:hidden">
                                <HomeBannerWidget variant="mobile-full" />
                            </div>

                            {/* 게시판 섹션 */}
                            <HomeBoardSection />

                            {/* 모바일: 커뮤니티 (풀너비) — Figma 순서: 게시판 → 커뮤니티 → 배너 → 정보+통계 */}
                            <div className="md:hidden">
                                <HomeCommunitySection />
                            </div>

                            {/* 모바일: 광고 배너 ② (커뮤니티 아래) */}
                            <div className="block md:hidden">
                                <HomeBannerWidget variant="mobile-full" />
                            </div>

                            {/* 모바일: 재개발 정보 + 통계 (합쳐진 카드) */}
                            <div className="md:hidden">
                                <HomeInfoSection />
                            </div>

                            {/* 태블릿 전용: 광고 배너 ② (커뮤니티+정보 바로 위 풀너비) */}
                            <div className="hidden md:block lg:hidden">
                                <HomeBannerWidget variant="tablet-full" />
                            </div>

                            {/* 태블릿~PC: 커뮤니티 + 재개발 정보 가로 배치
                                md(태블릿): 커뮤니티(왼쪽, flex-1) + 정보(오른쪽, flex-1)
                                lg(소형 데스크톱): 커뮤니티(왼쪽, 175px) + 정보(오른쪽, flex-1)
                                xl(풀 데스크톱): 커뮤니티(왼쪽, 282px) + 정보(오른쪽, flex-1) */}
                            <div className="hidden md:flex md:flex-row md:gap-[16px] lg:gap-[24px] xl:gap-[24px]">
                                {/* 커뮤니티 — md: flex-1(왼쪽), lg: 175px(왼쪽), xl: 282px(왼쪽) */}
                                {hasCommunityLinks && (
                                    <div className="flex-1 min-w-0 flex flex-col lg:w-[215px] lg:shrink-0 lg:flex-none xl:w-[282px]">
                                        <HomeCommunitySection />
                                    </div>
                                )}
                                {/* 재개발 정보 — md: flex-1(오른쪽), lg: flex-1(오른쪽), xl: flex-1(오른쪽) */}
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <HomeInfoSection />
                                </div>
                            </div>

                            {/* md 전용: 통계 풀너비 섹션 — 커뮤니티+정보 아래에 배치 */}
                            <div className="hidden md:block lg:hidden">
                                <HomeInfoSection statsOnly />
                            </div>

                            {/* lg 전용: 통계 풀너비 섹션 — 커뮤니티+정보 아래에 배치 */}
                            <div className="hidden lg:block xl:hidden">
                                <HomeInfoSection statsOnly />
                            </div>

                            {/* 파트너십 섹션 */}
                            <div className="mb-[100px]">
                                <HomePartnerships />
                            </div>
                        </div>

                        {/* 우측 광고 - 소형 데스크톱 이상에서 표시 */}
                        <aside className="hidden lg:block lg:w-[200px] xl:w-[279px] shrink-0">
                            <SideAdWidget />
                        </aside>
                    </div>
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
