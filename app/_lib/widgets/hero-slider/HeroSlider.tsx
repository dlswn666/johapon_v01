'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HeroSlide } from '@/app/_lib/shared/type/database.types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

interface HeroSliderProps {
    slides: HeroSlide[];
    autoPlayInterval?: number; // 자동 슬라이드 간격 (ms), 기본 4000ms
    className?: string;
}

/**
 * Hero Section 무한 슬라이드 컴포넌트
 * - 오른쪽 방향으로만 이동 (1→2→3→1→2...)
 * - 이미지가 없으면 "점검중..." 표시
 * - link_url이 있으면 클릭 가능 (cursor: pointer)
 */
export function HeroSlider({
    slides,
    autoPlayInterval = 4000,
    className,
}: HeroSliderProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

    // 슬라이드가 없거나 비활성화된 경우 점검중 화면 표시
    if (!slides || slides.length === 0) {
        return (
            <div className={cn(
                'relative w-full h-[400px] md:h-[500px] lg:h-[600px] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center',
                className
            )}>
                <div className="text-center space-y-4">
                    <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto" />
                    <div className="space-y-2">
                        <p className="text-2xl font-semibold text-gray-500">점검중...</p>
                        <p className="text-sm text-gray-400">곧 새로운 소식으로 찾아뵙겠습니다</p>
                    </div>
                </div>
            </div>
        );
    }

    // 무한 슬라이드를 위한 확장 배열 (앞뒤로 복제)
    const extendedSlides = slides.length > 1 
        ? [slides[slides.length - 1], ...slides, slides[0]]
        : slides;

    // 실제 인덱스 (확장 배열 기준)
    const actualIndex = slides.length > 1 ? currentIndex + 1 : currentIndex;

    // 다음 슬라이드로 이동
    const goToNext = useCallback(() => {
        if (slides.length <= 1 || isTransitioning) return;
        
        setIsTransitioning(true);
        setCurrentIndex((prev) => prev + 1);
    }, [slides.length, isTransitioning]);

    // 이전 슬라이드로 이동
    const goToPrev = useCallback(() => {
        if (slides.length <= 1 || isTransitioning) return;
        
        setIsTransitioning(true);
        setCurrentIndex((prev) => prev - 1);
    }, [slides.length, isTransitioning]);

    // 특정 인덱스로 이동
    const goToSlide = useCallback((index: number) => {
        if (isTransitioning || index === currentIndex) return;
        setIsTransitioning(true);
        setCurrentIndex(index);
    }, [currentIndex, isTransitioning]);

    // 무한 슬라이드 경계 처리
    useEffect(() => {
        if (!isTransitioning || slides.length <= 1) return;

        const timer = setTimeout(() => {
            setIsTransitioning(false);
            
            // 마지막 복제본에서 첫 번째로 점프
            if (currentIndex >= slides.length) {
                setCurrentIndex(0);
            }
            // 첫 번째 복제본에서 마지막으로 점프
            else if (currentIndex < 0) {
                setCurrentIndex(slides.length - 1);
            }
        }, 500); // transition duration과 일치

        return () => clearTimeout(timer);
    }, [currentIndex, isTransitioning, slides.length]);

    // 자동 슬라이드
    useEffect(() => {
        if (slides.length <= 1) return;

        const startAutoPlay = () => {
            autoPlayRef.current = setInterval(goToNext, autoPlayInterval);
        };

        startAutoPlay();

        return () => {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
            }
        };
    }, [slides.length, autoPlayInterval, goToNext]);

    // 슬라이드 클릭 핸들러
    const handleSlideClick = (slide: HeroSlide) => {
        if (slide.link_url) {
            window.open(slide.link_url, '_blank', 'noopener,noreferrer');
        }
    };

    // 마우스 호버 시 자동 슬라이드 일시 정지
    const handleMouseEnter = () => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
        }
    };

    const handleMouseLeave = () => {
        if (slides.length > 1) {
            autoPlayRef.current = setInterval(goToNext, autoPlayInterval);
        }
    };

    return (
        <div 
            className={cn('relative w-full overflow-hidden', className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* 슬라이드 컨테이너 */}
            <div
                ref={sliderRef}
                className={cn(
                    'flex h-[400px] md:h-[500px] lg:h-[600px]',
                    isTransitioning ? 'transition-transform duration-500 ease-in-out' : ''
                )}
                style={{
                    transform: `translateX(-${actualIndex * 100}%)`,
                }}
            >
                {extendedSlides.map((slide, index) => (
                    <div
                        key={`${slide.id}-${index}`}
                        className={cn(
                            'flex-shrink-0 w-full h-full relative',
                            slide.link_url ? 'cursor-pointer' : 'cursor-default'
                        )}
                        onClick={() => handleSlideClick(slide)}
                    >
                        <img
                            src={slide.image_url}
                            alt={`Slide ${index + 1}`}
                            className="w-full h-full object-cover"
                            draggable={false}
                        />
                    </div>
                ))}
            </div>

            {/* 이전/다음 버튼 (슬라이드가 2개 이상일 때만) */}
            {slides.length > 1 && (
                <>
                    <button
                        onClick={goToPrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
                        aria-label="이전 슬라이드"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
                        aria-label="다음 슬라이드"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}

            {/* 인디케이터 (슬라이드가 2개 이상일 때만) */}
            {slides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={cn(
                                'w-3 h-3 rounded-full transition-all duration-300',
                                currentIndex === index || 
                                (currentIndex >= slides.length && index === 0) ||
                                (currentIndex < 0 && index === slides.length - 1)
                                    ? 'bg-white scale-110'
                                    : 'bg-white/50 hover:bg-white/70'
                            )}
                            aria-label={`슬라이드 ${index + 1}로 이동`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default HeroSlider;


