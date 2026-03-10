'use client';

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useRandomAds } from '@/app/_lib/features/advertisement/api/useAdvertisement';
import { Advertisement } from '@/app/_lib/shared/type/database.types';
import { Skeleton } from '@/components/ui/skeleton';

// 개별 파트너 카드 컴포넌트
function PartnerCard({ partner, slug }: { partner: Advertisement; slug: string }) {
    return (
        <Link
            href={`/${slug}/communication/partner/${partner.id}`}
            className={cn(
                'flex-shrink-0 w-[137px]',
                'flex flex-col items-center gap-[10px]',
                'group cursor-pointer',
                'outline-none focus-visible:ring-2 focus-visible:ring-[#2f7f5f] focus-visible:ring-offset-2 rounded-[8px]'
            )}
            draggable={false}
        >
            <div className="relative w-[50px] h-[50px] overflow-hidden bg-gray-100 pointer-events-none">
                {partner.image_url ? (
                    <Image
                        src={partner.image_url}
                        alt={partner.title || partner.business_name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        sizes="50px"
                        draggable={false}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2f7f5f]/20 to-[#2f7f5f]/5">
                        <span className="text-[18px] font-bold text-[#2f7f5f]/40">
                            {(partner.title || partner.business_name).charAt(0)}
                        </span>
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-[2px] items-center w-full pointer-events-none">
                <h4 className="font-semibold text-[14px] text-black text-center leading-[1.6] truncate w-full group-hover:text-[#2f7f5f] transition-colors">
                    {partner.title || partner.business_name}
                </h4>
                {partner.content && (
                    <p className="text-[12px] font-light text-[#8a949e] leading-[1.4] line-clamp-2 w-full overflow-hidden text-center">
                        {partner.content}
                    </p>
                )}
            </div>
        </Link>
    );
}

// 타이밍 설정
const PAUSE_MS = 2000;       // 멈춰있는 시간
const SLIDE_MS = 1200;       // 슬라이드 애니메이션 시간
const SLIDE_EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

export function HomePartnerships() {
    const { slug, isLoading: isUnionLoading } = useSlug();
    const { data: partners, isLoading, error } = useRandomAds('BOARD', 10, !isUnionLoading);

    const trackRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentIndexRef = useRef(0);
    const cardWidthRef = useRef(0);
    const gapRef = useRef(20);
    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);
    const dragOffsetStartRef = useRef(0);
    const currentOffsetRef = useRef(0);
    const [, forceRender] = useState(0);

    const itemCount = partners?.length || 0;

    // 카드+gap 너비 측정
    const measure = useCallback(() => {
        if (!trackRef.current || itemCount === 0) return;
        const firstCard = trackRef.current.children[0] as HTMLElement | undefined;
        if (!firstCard) return;
        cardWidthRef.current = firstCard.offsetWidth;
        const style = window.getComputedStyle(trackRef.current);
        gapRef.current = parseFloat(style.gap) || 20;
    }, [itemCount]);

    const stepSize = () => cardWidthRef.current + gapRef.current;
    const singleSetWidth = () => stepSize() * itemCount;

    // transition 없이 즉시 이동
    const setOffsetInstant = useCallback((offset: number) => {
        if (!trackRef.current) return;
        trackRef.current.style.transition = 'none';
        trackRef.current.style.transform = `translateX(${-offset}px)`;
        currentOffsetRef.current = offset;
    }, []);

    // transition 있이 스무스 이동
    const setOffsetSmooth = useCallback((offset: number) => {
        if (!trackRef.current) return;
        trackRef.current.style.transition = `transform ${SLIDE_MS}ms ${SLIDE_EASE}`;
        trackRef.current.style.transform = `translateX(${-offset}px)`;
        currentOffsetRef.current = offset;
    }, []);

    // 한 칸 이동 후 → 대기 → 반복
    const scheduleNext = useCallback(() => {
        if (isDraggingRef.current || itemCount === 0) return;

        timerRef.current = setTimeout(() => {
            if (isDraggingRef.current) return;

            currentIndexRef.current += 1;
            const nextOffset = currentIndexRef.current * stepSize();

            // 한 세트를 다 돌았으면 → 즉시 리셋 후 다시 1칸 이동
            if (currentIndexRef.current >= itemCount) {
                setOffsetInstant(0);
                currentIndexRef.current = 0;
                // reflow 강제 후 다음 칸 스무스 이동
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                trackRef.current?.offsetHeight;
                currentIndexRef.current = 1;
                setOffsetSmooth(stepSize());
            } else {
                setOffsetSmooth(nextOffset);
            }

            // 슬라이드 끝난 뒤 다시 대기
            timerRef.current = setTimeout(() => {
                scheduleNext();
            }, SLIDE_MS);
        }, PAUSE_MS);
    }, [itemCount, setOffsetInstant, setOffsetSmooth]);

    // 타이머 정리
    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // 자동 재시작
    const restartAuto = useCallback(() => {
        clearTimer();
        scheduleNext();
    }, [clearTimer, scheduleNext]);

    // 마운트 시 시작
    useEffect(() => {
        if (itemCount === 0) return;
        const t = setTimeout(() => {
            measure();
            currentIndexRef.current = 0;
            setOffsetInstant(0);
            scheduleNext();
        }, 200);
        return () => {
            clearTimeout(t);
            clearTimer();
        };
    }, [itemCount, measure, setOffsetInstant, scheduleNext, clearTimer]);

    // 리사이즈
    useEffect(() => {
        const h = () => {
            measure();
            const offset = currentIndexRef.current * stepSize();
            setOffsetInstant(offset);
        };
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, [measure, setOffsetInstant]);

    // --- 터치 ---
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        clearTimer();
        isDraggingRef.current = true;
        dragStartXRef.current = e.touches[0].clientX;
        dragOffsetStartRef.current = currentOffsetRef.current;
        if (trackRef.current) trackRef.current.style.transition = 'none';
    }, [clearTimer]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDraggingRef.current) return;
        const dx = dragStartXRef.current - e.touches[0].clientX;
        let newOffset = dragOffsetStartRef.current + dx;
        const w = singleSetWidth();
        if (w > 0) {
            while (newOffset < 0) newOffset += w;
            while (newOffset >= w) newOffset -= w;
        }
        currentOffsetRef.current = newOffset;
        if (trackRef.current) {
            trackRef.current.style.transform = `translateX(${-newOffset}px)`;
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        isDraggingRef.current = false;
        // 가장 가까운 카드 위치로 스냅
        const step = stepSize();
        if (step > 0) {
            const nearest = Math.round(currentOffsetRef.current / step);
            currentIndexRef.current = nearest % itemCount;
            setOffsetSmooth(nearest * step);
        }
        setTimeout(() => restartAuto(), SLIDE_MS);
    }, [itemCount, setOffsetSmooth, restartAuto]);

    // --- 마우스 드래그 ---
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        clearTimer();
        isDraggingRef.current = true;
        dragStartXRef.current = e.clientX;
        dragOffsetStartRef.current = currentOffsetRef.current;
        if (trackRef.current) trackRef.current.style.transition = 'none';
        e.preventDefault();
    }, [clearTimer]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDraggingRef.current) return;
        const dx = dragStartXRef.current - e.clientX;
        let newOffset = dragOffsetStartRef.current + dx;
        const w = singleSetWidth();
        if (w > 0) {
            while (newOffset < 0) newOffset += w;
            while (newOffset >= w) newOffset -= w;
        }
        currentOffsetRef.current = newOffset;
        if (trackRef.current) {
            trackRef.current.style.transform = `translateX(${-newOffset}px)`;
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        const step = stepSize();
        if (step > 0) {
            const nearest = Math.round(currentOffsetRef.current / step);
            currentIndexRef.current = nearest % itemCount;
            setOffsetSmooth(nearest * step);
        }
        setTimeout(() => restartAuto(), SLIDE_MS);
    }, [itemCount, setOffsetSmooth, restartAuto]);

    const handleMouseLeave = useCallback(() => {
        if (isDraggingRef.current) handleMouseUp();
    }, [handleMouseUp]);

    // 복제 배열 (원본 + 클론)
    const displayItems = useMemo(() => {
        if (!partners || partners.length === 0) return [];
        return [...partners, ...partners];
    }, [partners]);

    // 로딩
    if (isUnionLoading || isLoading) {
        return (
            <section className="w-full">
                <div className="flex items-center justify-between mb-[12px] md:mb-[16px]">
                    <Skeleton className="h-[16px] md:h-[20px] w-[120px]" />
                    <Skeleton className="h-[12px] md:h-[14px] w-[150px]" />
                </div>
                <div className="flex gap-[20px] md:gap-[30px] xl:gap-[45px]">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[137px] flex flex-col items-center gap-[10px]">
                            <Skeleton className="w-[50px] h-[50px]" />
                            <Skeleton className="h-[14px] w-[80px]" />
                            <Skeleton className="h-[12px] w-[120px]" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (error || !partners || partners.length === 0) return null;

    return (
        <section className="w-full">
            <div className="flex items-center justify-between mb-[20px] md:mb-[30px]">
                <h3 className="font-semibold text-[14px] md:text-[16px] text-black tracking-[1px] leading-[1.6]">
                    PARTNERSHIPS
                </h3>
                <Link
                    href={`/${slug}/communication/partner`}
                    className={cn(
                        'flex items-center gap-[4px] text-[12px] text-[#b1b8be] leading-[1.4] hover:text-[#2f7f5f] transition-colors',
                        'outline-none focus-visible:ring-2 focus-visible:ring-[#2f7f5f] focus-visible:ring-offset-2 rounded-sm'
                    )}
                >
                    <span>{`함께하는 협력 업체입니다 >`}</span>
                </Link>
            </div>

            <div
                className="overflow-hidden select-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: 'grab' }}
            >
                <div
                    ref={trackRef}
                    className="flex gap-[20px] md:gap-[30px] xl:gap-[45px] will-change-transform"
                    style={{ transform: 'translateX(0px)' }}
                >
                    {displayItems.map((partner, index) => (
                        <PartnerCard
                            key={`${partner.id}-${index}`}
                            partner={partner}
                            slug={slug || ''}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

export default HomePartnerships;
