'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { HeroSlide } from '@/app/_lib/shared/type/database.types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

interface HeroSliderProps {
    slides: HeroSlide[];
    autoPlayInterval?: number; // 자동 슬라이드 간격 (ms), 기본 4000ms
    className?: string;
    title?: string; // 중앙 타이틀 (선택)
    description?: string; // 중앙 설명 (선택)
}

/**
 * Hero Section 무한 슬라이드 컴포넌트
 * - 오른쪽 방향으로만 이동 (1→2→3→1→2...)
 * - 이미지가 없으면 "점검중..." 표시
 * - link_url이 있으면 클릭 가능 (cursor: pointer)
 */
export function HeroSlider({ slides, autoPlayInterval = 4000, className, title: _title, description: _description }: HeroSliderProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

    const hasSlides = slides && slides.length > 0;
    const hasMultipleSlides = hasSlides && slides.length > 1;

    // 무한 슬라이드를 위한 확장 배열 (앞뒤로 복제)
    const extendedSlides = hasMultipleSlides
        ? [slides[slides.length - 1], ...slides, slides[0]]
        : hasSlides
        ? slides
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
        },
        [currentIndex, isTransitioning]
    );

    // 무한 슬라이드 경계 처리
    useEffect(() => {
        if (!isTransitioning || !hasMultipleSlides) return;

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
    }, [currentIndex, isTransitioning, hasMultipleSlides, slides.length]);

    // 자동 슬라이드
    useEffect(() => {
        if (!hasMultipleSlides) return;

        const startAutoPlay = () => {
            autoPlayRef.current = setInterval(goToNext, autoPlayInterval);
        };

        startAutoPlay();

        return () => {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
            }
        };
    }, [hasMultipleSlides, autoPlayInterval, goToNext]);

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
        if (hasMultipleSlides) {
            autoPlayRef.current = setInterval(goToNext, autoPlayInterval);
        }
    };

    // 슬라이드가 없거나 비활성화된 경우 점검중 화면 표시
    if (!hasSlides) {
        return (
            <div
                className={cn(
                    'relative w-full h-[400px] md:h-[500px] lg:h-[600px] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center',
                    className
                )}
            >
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
                        <Image
                            src={slide.image_url}
                            alt={`Slide ${index + 1}`}
                            fill
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
                        className="absolute left-[36px] top-1/2 -translate-y-1/2 bg-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.4)] text-white rounded-full transition-colors z-20 w-[63px] h-[63px] flex items-center justify-center"
                        aria-label="이전 슬라이드"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute right-[36px] top-1/2 -translate-y-1/2 bg-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.4)] text-white rounded-full transition-colors z-20 w-[63px] h-[63px] flex items-center justify-center"
                        aria-label="다음 슬라이드"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}

            {/* 인디케이터 (슬라이드가 2개 이상일 때만) */}
            {hasMultipleSlides && (
                <div className="absolute bottom-[50px] left-1/2 -translate-x-1/2 flex gap-[13.5px] z-20">
                    {slides.map((_, index) => {
                        const isActive =
                            currentIndex === index ||
                            (currentIndex >= slides.length && index === 0) ||
                            (currentIndex < 0 && index === slides.length - 1);
                        return (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={cn(
                                    'rounded-full transition-all duration-300',
                                    isActive
                                        ? 'bg-white w-[13.5px] h-[13.5px]'
                                        : 'bg-[rgba(255,255,255,0.5)] w-[13.5px] h-[13.5px] hover:bg-[rgba(255,255,255,0.7)]'
                                )}
                                aria-label={`슬라이드 ${index + 1}로 이동`}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default HeroSlider;
