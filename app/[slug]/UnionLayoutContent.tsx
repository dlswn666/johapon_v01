'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import UnionInfoFooter from '@/app/_lib/widgets/union-info-footer/UnionInfoFooter';
import UnionHomeHeader from '@/app/_lib/widgets/union/header/UnionHomeHeader';
import UnionBreadcrumb from '@/app/_lib/widgets/union/breadcrumb/UnionBreadcrumb';
import { UserStatusModal } from '@/app/_lib/widgets/modal';
import { SideAdWidget } from '@/app/_lib/features/advertisement/ui/SideAdWidget';
import { MainBannerWidget } from '@/app/_lib/features/advertisement/ui/MainBannerWidget';

function SkipNavLink() {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-[#4E8C6D] focus:text-white focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg"
        >
            본문 바로가기
        </a>
    );
}

interface UnionLayoutContentProps {
    children: React.ReactNode;
}

export default function UnionLayoutContent({ children }: UnionLayoutContentProps) {
    const { union, slug, isLoading: isUnionLoading } = useSlug();
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const pathname = usePathname();

    // 홈 페이지 여부 확인
    const isHomePage = pathname === `/${slug}`;

    // 관리자 페이지 여부 확인 (admin 경로)
    const isAdminPage = pathname.startsWith(`/${slug}/admin`);

    // 랜딩 페이지 여부 확인 (비로그인 + 홈페이지)
    const isLandingPage = isHomePage && !isAuthenticated;

    // 로딩 중
    if (isUnionLoading || isAuthLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto max-w-[1280px] px-4 py-8">
                    <Skeleton className="w-full h-[600px] rounded-[24px]" />
                    <p className="text-center text-gray-400 mt-4">로딩 중...</p>
                </div>
            </div>
        );
    }

    // 비활성화된 조합 접근 차단
    // union 객체에 is_active가 있는지 확인 (타입 확장 필요)
    const unionWithActive = union as (typeof union & { is_active?: boolean }) | null;

    if (unionWithActive && unionWithActive.is_active === false) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-gray-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-3">조합 홈페이지가 비활성화 되었습니다</h1>
                    <p className="text-gray-500 mb-6">
                        해당 조합의 홈페이지가 현재 비활성화 상태입니다.
                        <br />
                        자세한 내용은 조합에 문의해주세요.
                    </p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
                    >
                        홈으로 돌아가기
                    </Link>
                </div>
            </div>
        );
    }

    // 랜딩 페이지 레이아웃 (비로그인 + 홈페이지): Header, 사이드 광고 없이 Footer만 표시
    if (isLandingPage) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <SkipNavLink />
                <MainBannerWidget />
                <main id="main-content" className="flex-1">{children}</main>
                {union && <UnionInfoFooter union={union} />}
                <UserStatusModal />
            </div>
        );
    }

    // 관리자 페이지 레이아웃 (광고 영역 없이 전체 너비 사용)
    if (isAdminPage) {
        return (
            <div className="min-h-[1080px] bg-gray-50 flex flex-col">
                <SkipNavLink />
                <MainBannerWidget />
                {/* Header - 모든 페이지에서 공통 렌더링 */}
                <UnionHomeHeader />

                {/* Breadcrumb */}
                <UnionBreadcrumb />

                {/* 전체 너비 메인 콘텐츠 (광고 영역 없음) */}
                <main id="main-content" className="flex-1 min-h-[1200px]">{children}</main>

                {/* Footer 표시 */}
                {union && <UnionInfoFooter union={union} />}

                {/* 사용자 상태 모달 (승인대기/반려) */}
                <UserStatusModal />
            </div>
        );
    }

    // 홈 페이지 레이아웃 (로그인 상태): 광고 없이 전체 너비, 홈 페이지 내부에서 광고 배치
    if (isHomePage) {
        return (
            <div className="min-h-[1080px] bg-white flex flex-col">
                <SkipNavLink />
                <MainBannerWidget />
                {/* Header */}
                <UnionHomeHeader />

                {/* 홈 페이지 메인 콘텐츠 (전체 너비) */}
                <main id="main-content" className="flex-1">{children}</main>

                {/* Footer 표시 */}
                {union && <UnionInfoFooter union={union} />}

                {/* 사용자 상태 모달 (승인대기/반려) */}
                <UserStatusModal />
            </div>
        );
    }

    // 일반 레이아웃 (로그인 상태, 홈이 아닌 다른 페이지)
    return (
        <div className="min-h-[1080px] bg-gray-50 flex flex-col">
            <SkipNavLink />
            <MainBannerWidget />
            {/* Header - 모든 페이지에서 공통 렌더링 */}
            <UnionHomeHeader />

            {/* Breadcrumb - 홈 페이지가 아닐 때만 렌더링 */}
            <UnionBreadcrumb />

            {/* ABC 3분할 레이아웃 */}
            {/* Desktop: 가로 배치 (20% / 60% / 20%), Mobile: 세로 쌓기 (A → B → C) */}
            <div className="flex-1 flex flex-col md:flex-row min-h-[1200px]">
                {/* A 영역 - 왼쪽 광고 */}
                <aside className="hidden md:block w-full md:w-[20%] bg-gray-100 p-4 order-2 md:order-1">
                    <div className="sticky top-24 md:h-[50vh]">
                        <SideAdWidget />
                    </div>
                </aside>

                {/* B 영역 - 메인 콘텐츠 */}
                <main id="main-content" className="w-full md:w-[60%] order-1 md:order-2 min-h-[1200px]">{children}</main>

                {/* C 영역 - 오른쪽 광고 */}
                <aside className="hidden md:block w-full md:w-[20%] bg-gray-100 p-4 order-3">
                    <div className="sticky top-24 md:h-[50vh]">
                        <SideAdWidget />
                    </div>
                </aside>
            </div>

            {/* Footer 표시 */}
            {union && <UnionInfoFooter union={union} />}

            {/* 사용자 상태 모달 (승인대기/반려) */}
            <UserStatusModal />
        </div>
    );
}
