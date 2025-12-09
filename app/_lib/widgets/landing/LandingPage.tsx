'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CrossfadeBackground } from './CrossfadeBackground';
import { LoginForm } from './LoginForm';

interface LandingPageProps {
    unionName: string;
    onLoginSuccess?: () => void;
    className?: string;
}

/**
 * 조합 랜딩 페이지 컴포넌트
 * - 크로스페이드 배경 (재개발 전 → 후)
 * - 조합명 표시
 * - 로그인 폼
 */
export function LandingPage({ unionName, onLoginSuccess, className }: LandingPageProps) {
    return (
        <div
            className={cn(
                'relative min-h-screen w-full',
                'flex flex-col items-center justify-center',
                'py-8 px-4',
                className
            )}
        >
            {/* 크로스페이드 배경 */}
            <CrossfadeBackground />

            {/* 콘텐츠 영역 */}
            <div className="relative z-10 w-full max-w-[500px] flex flex-col items-center">
                {/* 조합명 */}
                <h1
                    className={cn(
                        'text-3xl md:text-4xl lg:text-5xl font-bold',
                        'text-gray-800 text-center',
                        'mb-8 md:mb-10',
                        'drop-shadow-lg',
                        // 배경 위에서 가독성을 위해 텍스트 섀도우 추가
                        '[text-shadow:_2px_2px_8px_rgba(255,255,255,0.8)]'
                    )}
                >
                    {unionName}
                </h1>

                {/* 로그인 폼 */}
                <LoginForm unionName={unionName} onLoginSuccess={onLoginSuccess} />
            </div>
        </div>
    );
}

export default LandingPage;

