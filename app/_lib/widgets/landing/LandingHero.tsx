'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroSlide {
    id: string;
    imageUrl: string;
    title?: string;
    subtitle?: string;
}

interface LandingHeroProps {
    unionName: string;
    slides?: HeroSlide[];
    autoPlayInterval?: number;
    className?: string;
}

// 기본 슬라이드 (피그마 디자인 기반)
const defaultSlides: HeroSlide[] = [
    {
        id: '1',
        imageUrl: 'https://images.unsplash.com/photo-1692528489009-26e108f3ecb7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
        title: '새로운 미래도시',
        subtitle: '지금 여기서 시작합니다',
    },
    {
        id: '2',
        imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
        title: '함께 만들어가는',
        subtitle: '우리의 새로운 터전',
    },
    {
        id: '3',
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
        title: '더 나은 내일을 위한',
        subtitle: '오늘의 한 걸음',
    },
];

/**
 * 조합 랜딩 페이지 히어로 섹션
 * 피그마: HeroSection (868:7442) - 1814×700px
 * 
 * 구조:
 * - HeroBackgroundImage: 이미지 + 그라디언트 오버레이
 * - CarouselControls: 좌/우 화살표 (opacity 30%)
 * - ProgressIndicator: 캐러셀 진행 바
 * - HeroTextOverlay: 블러 배경 + 텍스트
 */
export function LandingHero({ 
    unionName: _unionName, 
    slides = defaultSlides,
    autoPlayInterval = 5000,
    className 
}: LandingHeroProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    const goToSlide = useCallback((index: number) => {
        setCurrentIndex(index);
    }, []);

    const goToPrevious = useCallback(() => {
        setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    }, [slides.length]);

    const goToNext = useCallback(() => {
        setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, [slides.length]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    }, []);

    const handleTouchEnd = useCallback(() => {
        const delta = touchStartX.current - touchEndX.current;
        if (Math.abs(delta) > 50) {
            if (delta > 0) {
                goToNext();
            } else {
                goToPrevious();
            }
        }
    }, [goToNext, goToPrevious]);

    // 자동 재생
    useEffect(() => {
        if (isHovered || slides.length <= 1) return;

        const interval = setInterval(goToNext, autoPlayInterval);
        return () => clearInterval(interval);
    }, [goToNext, autoPlayInterval, isHovered, slides.length]);

    const currentSlide = slides[currentIndex];

    return (
        <section 
            className={cn(
                'relative w-full',
                'h-[400px] md:h-[500px] lg:h-[700px]',
                'overflow-hidden',
                className
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Background Image with Gradient Overlay - 피그마: 868:7460 */}
            {slides.map((slide, index) => (
                <div
                    key={slide.id}
                    className={cn(
                        'absolute inset-0 transition-opacity duration-700',
                        index === currentIndex ? 'opacity-100' : 'opacity-0'
                    )}
                >
                    <Image
                        src={slide.imageUrl}
                        alt={slide.title || `Slide ${index + 1}`}
                        fill
                        className="object-cover"
                        priority={index === 0}
                    />
                    {/* Gradient Overlay - 상하 어둡게 */}
                    <div 
                        className={cn(
                            'absolute inset-0',
                            'bg-gradient-to-b from-black/50 via-transparent to-black/60'
                        )}
                    />
                </div>
            ))}

            {/* Carousel Controls - 피그마: 868:7461 */}
            {slides.length > 1 && (
                <>
                    <button
                        onClick={goToPrevious}
                        className={cn(
                            'absolute left-4 md:left-8 top-1/2 -translate-y-1/2',
                            'w-10 h-10 md:w-12 md:h-12',
                            'bg-white/30 hover:bg-white/50',
                            'rounded-full',
                            'flex items-center justify-center',
                            'transition-all duration-200',
                            'z-10'
                        )}
                        aria-label="이전 슬라이드"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </button>
                    <button
                        onClick={goToNext}
                        className={cn(
                            'absolute right-4 md:right-8 top-1/2 -translate-y-1/2',
                            'w-10 h-10 md:w-12 md:h-12',
                            'bg-white/30 hover:bg-white/50',
                            'rounded-full',
                            'flex items-center justify-center',
                            'transition-all duration-200',
                            'z-10'
                        )}
                        aria-label="다음 슬라이드"
                    >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </button>
                </>
            )}

            {/* Hero Text Overlay - 피그마: 868:7466 */}
            <div 
                className={cn(
                    'absolute bottom-12 md:bottom-16 lg:bottom-24',
                    'left-1/2 -translate-x-1/2',
                    'w-[90%] max-w-[600px]',
                    'z-10'
                )}
            >
                <div 
                    className={cn(
                        'backdrop-blur-md bg-white/20',
                        'rounded-2xl',
                        'px-6 py-6 md:px-10 md:py-8',
                        'text-center',
                        'shadow-lg'
                    )}
                >
                    <h1 
                        className={cn(
                            'font-bold text-white',
                            'text-2xl md:text-4xl lg:text-[45px]',
                            'leading-tight',
                            'drop-shadow-lg'
                        )}
                    >
                        {currentSlide?.title || '새로운 미래도시'}
                        <br />
                        {currentSlide?.subtitle || '지금 여기서 시작합니다'}
                    </h1>
                </div>
            </div>

            {/* Progress Indicator - 피그마: 868:7464 */}
            {slides.length > 1 && (
                <div 
                    className={cn(
                        'absolute bottom-4 md:bottom-6',
                        'left-1/2 -translate-x-1/2',
                        'flex items-center gap-2',
                        'z-10'
                    )}
                >
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={cn(
                                'h-2 rounded-full transition-all duration-300',
                                index === currentIndex 
                                    ? 'w-8 bg-white' 
                                    : 'w-2 bg-white/50 hover:bg-white/70'
                            )}
                            aria-label={`슬라이드 ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

export default LandingHero;
