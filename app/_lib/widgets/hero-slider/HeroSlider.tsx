'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { HeroSlide } from '@/app/_lib/shared/type/database.types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// 기본 슬라이드 이미지 (슬라이드가 없을 때 사용)
const DEFAULT_SLIDES: HeroSlide[] = [
    {
        id: 'default-1',
        union_id: '',
        image_url: '/images/slide-default/first_default_slide.png',
        link_url: null,
        display_order: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'default-2',
        union_id: '',
        image_url: '/images/slide-default/second_default_slide.png',
        link_url: null,
        display_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

interface HeroSliderProps {
    slides: HeroSlide[];
    autoPlayInterval?: number; // 자동 슬라이드 간격 (ms), 기본 4000ms
    className?: string;
}

/**
 * Hero Section 무한 슬라이드 컴포넌트
 * - 오른쪽 방향으로만 이동 (1→2→3→1→2...)
 * - 이미지가 없으면 기본 슬라이드 이미지 표시
 * - link_url이 있으면 클릭 가능 (cursor: pointer)
 */
export function HeroSlider({ slides, autoPlayInterval = 4000, className }: HeroSliderProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [progressKey, setProgressKey] = useState(0);
    const reducedMotion = useReducedMotion();

    // 터치 스와이프 관련 상태
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);
    const isSwiping = useRef<boolean>(false);

    // 슬라이드가 없으면 기본 슬라이드 사용
    const activeSlides = useMemo(() => {
        return slides && slides.length > 0 ? slides : DEFAULT_SLIDES;
    }, [slides]);

    const hasSlides = activeSlides.length > 0;
    const hasMultipleSlides = activeSlides.length > 1;

    // 무한 슬라이드를 위한 확장 배열 (앞뒤로 복제)
    const extendedSlides = hasMultipleSlides
        ? [activeSlides[activeSlides.length - 1], ...activeSlides, activeSlides[0]]
        : hasSlides
            ? activeSlides
            : [];

    // 실제 인덱스 (확장 배열 기준)
    const actualIndex = hasMultipleSlides ? currentIndex + 1 : currentIndex;

    // 다음 슬라이드로 이동
    const goToNext = useCallback(() => {
        if (!hasMultipleSlides || isTransitioning) return;

        setIsTransitioning(true);
        setCurrentIndex((prev) => prev + 1);
    }, [hasMultipleSlides, isTransitioning]);

    // 이전 슬라이드로 이동
    const goToPrev = useCallback(() => {
        if (!hasMultipleSlides || isTransitioning) return;

        setIsTransitioning(true);
        setCurrentIndex((prev) => prev - 1);
    }, [hasMultipleSlides, isTransitioning]);

    // 특정 인덱스로 이동
    const goToSlide = useCallback(
        (index: number) => {
            if (isTransitioning || index === currentIndex) return;
            setIsTransitioning(true);
            setCurrentIndex(index);
            setProgressKey((prev) => prev + 1);
        },
        [currentIndex, isTransitioning]
    );

    // 무한 슬라이드 경계 처리
    useEffect(() => {
        if (!isTransitioning || !hasMultipleSlides) return;

        const timer = setTimeout(() => {
            setIsTransitioning(false);

            // 마지막 복제본에서 첫 번째로 점프
            if (currentIndex >= activeSlides.length) {
                setCurrentIndex(0);
                setProgressKey((prev) => prev + 1);
            }
            // 첫 번째 복제본에서 마지막으로 점프
            else if (currentIndex < 0) {
                setCurrentIndex(activeSlides.length - 1);
                setProgressKey((prev) => prev + 1);
            }
        }, 500); // transition duration과 일치

        return () => clearTimeout(timer);
    }, [currentIndex, isTransitioning, hasMultipleSlides, activeSlides.length]);

    // 자동 슬라이드 (reduced-motion이 활성화되면 자동 슬라이드 비활성화)
    useEffect(() => {
        if (!hasMultipleSlides || reducedMotion || isPaused) return;

        const timerId = setInterval(goToNext, autoPlayInterval);

        return () => {
            clearInterval(timerId);
        };
    }, [hasMultipleSlides, autoPlayInterval, goToNext, reducedMotion, isPaused]);

    // 터치 스와이프 핸들러
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        isSwiping.current = true;
        // 스와이프 시작 시 자동 슬라이드 일시 정지
        setIsPaused(true);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isSwiping.current) return;
        touchEndX.current = e.touches[0].clientX;
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (!isSwiping.current || !hasMultipleSlides) {
            isSwiping.current = false;
            setIsPaused(false);
            return;
        }

        const swipeDistance = touchStartX.current - touchEndX.current;
        const minSwipeDistance = 50; // 최소 스와이프 거리

        if (Math.abs(swipeDistance) > minSwipeDistance) {
            if (swipeDistance > 0) {
                // 왼쪽으로 스와이프 → 다음 슬라이드
                goToNext();
            } else {
                // 오른쪽으로 스와이프 → 이전 슬라이드
                goToPrev();
            }
        }

        // 터치 끝나면 자동 슬라이드 재시작
        setIsPaused(false);

        isSwiping.current = false;
        touchStartX.current = 0;
        touchEndX.current = 0;
    }, [hasMultipleSlides, goToNext, goToPrev]);

    // 슬라이드 클릭 핸들러
    const handleSlideClick = (slide: HeroSlide) => {
        if (slide.link_url) {
            window.open(slide.link_url, '_blank', 'noopener,noreferrer');
        }
    };

    // 마우스 호버 시 자동 슬라이드 일시 정지
    const handleMouseEnter = () => {
        setIsPaused(true);
    };

    const handleMouseLeave = () => {
        setIsPaused(false);
    };

    return (
        <div
            className={cn('relative w-full overflow-hidden touch-pan-y', className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="region"
            aria-roledescription="carousel"
            aria-label="히어로 슬라이드"
        >
            {/* 슬라이드 컨테이너 */}
            <div
                ref={sliderRef}
                className={cn(
                    'flex h-[300px] md:h-[500px] lg:h-[700px]',
                    isTransitioning && !reducedMotion ? 'transition-transform duration-500 ease-in-out' : ''
                )}
                style={{
                    transform: `translateX(-${actualIndex * 100}%)`,
                }}
            >
                {extendedSlides.map((slide, index) => (
                    <div
                        key={`${slide.id}-${index}`}
                        className={cn(
                            'flex-shrink-0 w-full h-full relative bg-gray-100',
                            slide.link_url ? 'cursor-pointer' : 'cursor-default'
                        )}
                        onClick={() => handleSlideClick(slide)}
                    >
                        <Image
                            src={slide.image_url}
                            alt={slide.link_url ? `슬라이드 ${index + 1} - 클릭하여 자세히 보기` : `슬라이드 ${index + 1}`}
                            fill
                            sizes="100vw"
                            className="object-cover"
                            draggable={false}
                            priority={index === 0}
                        />
                    </div>
                ))}
            </div>

            {/* 이전/다음 버튼 (슬라이드가 2개 이상일 때만) */}
            {hasMultipleSlides && (
                <>
                    <button
                        onClick={goToPrev}
                        className="absolute left-[16px] md:left-[36px] top-1/2 -translate-y-1/2 bg-[rgba(0,0,0,0.25)] hover:bg-[rgba(0,0,0,0.4)] text-white rounded-full transition-all duration-200 z-20 w-[44px] h-[44px] md:w-[63px] md:h-[63px] flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 outline-none backdrop-blur-[2px]"
                        aria-label="이전 슬라이드"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute right-[16px] md:right-[36px] top-1/2 -translate-y-1/2 bg-[rgba(0,0,0,0.25)] hover:bg-[rgba(0,0,0,0.4)] text-white rounded-full transition-all duration-200 z-20 w-[44px] h-[44px] md:w-[63px] md:h-[63px] flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 outline-none backdrop-blur-[2px]"
                        aria-label="다음 슬라이드"
                    >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
                    </button>
                </>
            )}

            {/* 프로그레스 바 인디케이터 (슬라이드가 2개 이상일 때만) */}
            {hasMultipleSlides && (
                <div className="absolute bottom-[20px] md:bottom-[50px] left-[16px] md:left-[164px] z-20 flex gap-0 w-[calc(100%-32px)] md:w-[728px] h-[8px] md:h-[13px] bg-[rgba(255,255,255,0.3)] rounded-full overflow-hidden backdrop-blur-[2px]">
                    {activeSlides.map((_, index) => {
                        const isActive =
                            currentIndex === index ||
                            (currentIndex >= activeSlides.length && index === 0) ||
                            (currentIndex < 0 && index === activeSlides.length - 1);
                        return (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className="flex-1 relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
                                aria-label={`슬라이드 ${index + 1}로 이동`}
                                aria-current={isActive ? 'true' : undefined}
                            >
                                {isActive && (
                                    <div
                                        key={progressKey}
                                        className="absolute inset-0 bg-[#2f7f5f] rounded-full origin-left"
                                        style={{
                                            animation: isPaused || reducedMotion
                                                ? 'none'
                                                : `progress-fill ${autoPlayInterval}ms linear forwards`,
                                            animationPlayState: isPaused ? 'paused' : 'running',
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default HeroSlider;
