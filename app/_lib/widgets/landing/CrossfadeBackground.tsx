'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CrossfadeBackgroundProps {
    className?: string;
    /** 크로스페이드 애니메이션 지속 시간 (ms) */
    duration?: number;
    /** 애니메이션 시작 전 대기 시간 (ms) */
    delay?: number;
}

/**
 * 크로스페이드 배경 컴포넌트
 * - 이미지 1 (재개발 전)이 점점 희미해지고
 * - 이미지 2 (재개발 후)가 뚜렷해지는 효과
 * - 애니메이션은 한 번만 실행 (루프 없음)
 */
export function CrossfadeBackground({
    className,
    duration = 3000,
    delay = 1000,
}: CrossfadeBackgroundProps) {
    const [isTransitioned, setIsTransitioned] = useState(false);

    useEffect(() => {
        // 지정된 딜레이 후 크로스페이드 시작
        const timer = setTimeout(() => {
            setIsTransitioned(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div className={cn('absolute inset-0 overflow-hidden', className)}>
            {/* 이미지 2: 재개발 후 (아래 레이어, 항상 표시) */}
            <div className="absolute inset-0">
                <Image
                    src="/images/landing/after.jpg"
                    alt="재개발 후 현대적 아파트 단지"
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            {/* 이미지 1: 재개발 전 (위 레이어, 페이드아웃) */}
            <div
                className="absolute inset-0 transition-opacity ease-in-out"
                style={{
                    opacity: isTransitioned ? 0 : 1,
                    transitionDuration: `${duration}ms`,
                }}
            >
                <Image
                    src="/images/landing/before.jpg"
                    alt="재개발 전 노후 골목길"
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            {/* 어두운 반투명 오버레이 */}
            <div className="absolute inset-0 bg-black/40" />
        </div>
    );
}

export default CrossfadeBackground;

