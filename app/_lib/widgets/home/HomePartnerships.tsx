'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAdsByType } from '@/app/_lib/features/advertisement/api/useAdvertisement';
import { Skeleton } from '@/components/ui/skeleton';

export function HomePartnerships() {
    const { slug, isLoading: isUnionLoading } = useSlug();
    const { data: partners, isLoading, error } = useAdsByType('BOARD', !isUnionLoading);

    // 로딩 중
    if (isUnionLoading || isLoading) {
        return (
            <section className="w-full">
                {/* 헤더 스켈레톤 */}
                <div className="flex items-center justify-between mb-[12px] md:mb-[16px]">
                    <Skeleton className="h-[16px] md:h-[20px] w-[120px]" />
                    <Skeleton className="h-[12px] md:h-[14px] w-[150px]" />
                </div>
                {/* 카드 스켈레톤 */}
                <div className="flex gap-[20px] md:gap-[45px]">
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

    // 에러 또는 데이터 없음
    if (error || !partners || partners.length === 0) {
        return null;
    }

    return (
        <section className="w-full">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-[12px] md:mb-[16px]">
                <h3 className="font-semibold text-[14px] md:text-[16px] text-black">
                    파트너십
                </h3>
                <Link
                    href={`/${slug}/communication/partner`}
                    className={cn(
                        'flex items-center gap-[4px] text-[12px] text-[#b1b8be] hover:text-[#2f7f5f] transition-colors',
                        'outline-none focus-visible:ring-2 focus-visible:ring-[#2f7f5f] focus-visible:ring-offset-2 rounded-sm'
                    )}
                >
                    <span>함께하는 협력 업체입니다</span>
                    <ChevronRight className="w-[12px] h-[12px] md:w-[14px] md:h-[14px]" />
                </Link>
            </div>

            {/* 카드 컨테이너 - Figma: 137px per card, 45px gap */}
            <div
                className={cn(
                    'flex gap-[20px] md:gap-[45px] overflow-x-auto snap-x snap-mandatory',
                    'scrollbar-hide pb-[4px]',
                    'touch-pan-x'
                )}
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {partners.map((partner) => (
                    <Link
                        key={partner.id}
                        href={`/${slug}/communication/partner/${partner.id}`}
                        className={cn(
                            'flex-shrink-0 w-[137px] snap-start',
                            'flex flex-col items-center gap-[10px]',
                            'group cursor-pointer',
                            'outline-none focus-visible:ring-2 focus-visible:ring-[#2f7f5f] focus-visible:ring-offset-2 rounded-[8px]'
                        )}
                    >
                        {/* 썸네일 - 피그마: 50px 정사각형 */}
                        <div className="relative w-[50px] h-[50px] overflow-hidden bg-gray-100 rounded-[8px]">
                            {partner.image_url ? (
                                <Image
                                    src={partner.image_url}
                                    alt={partner.title || partner.business_name}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                                    sizes="50px"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2f7f5f]/20 to-[#2f7f5f]/5">
                                    <span className="text-[18px] font-bold text-[#2f7f5f]/40">
                                        {(partner.title || partner.business_name).charAt(0)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 제목 - Figma: Semibold 14px, center */}
                        <h4 className="font-semibold text-[14px] text-black text-center truncate w-full group-hover:text-[#2f7f5f] transition-colors">
                            {partner.title || partner.business_name}
                        </h4>

                        {/* 설명 - Figma: Light 12px, 2줄 */}
                        {partner.content && (
                            <p className="text-[12px] font-light text-[#8a949e] line-clamp-2 text-center w-full">
                                {partner.content}
                            </p>
                        )}
                    </Link>
                ))}
            </div>
        </section>
    );
}

export default HomePartnerships;
