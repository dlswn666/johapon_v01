'use client';

import { ReactNode } from 'react';
import SideBannerAds from '@/widgets/common/SideBannerAds';

interface TenantContentLayoutProps {
    children: ReactNode;
    className?: string;
}

export default function TenantContentLayout({ children, className = '' }: TenantContentLayoutProps) {
    return (
        <div className={`max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-8 ${className}`}>
            {/* 모바일: 헤더 -> 광고 -> 본문 -> 광고 */}
            {/* 데스크톱: 사이드 광고 - 본문 - 사이드 광고 */}

            {/* 모바일에서만 보이는 상단 광고 */}
            <div className="block lg:hidden mb-6">
                <SideBannerAds />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* 왼쪽 사이드바 - 데스크톱에서만 표시 */}
                <div className="hidden lg:block lg:col-span-1">
                    <div className="sticky top-8">
                        <SideBannerAds />
                    </div>
                </div>

                {/* 메인 콘텐츠 */}
                <div className="lg:col-span-3">{children}</div>

                {/* 오른쪽 사이드바 - 데스크톱에서만 표시 */}
                <div className="hidden lg:block lg:col-span-1">
                    <div className="sticky top-8">
                        <SideBannerAds />
                    </div>
                </div>
            </div>

            {/* 모바일에서만 보이는 하단 광고 */}
            <div className="block lg:hidden mt-6">
                <SideBannerAds />
            </div>
        </div>
    );
}
