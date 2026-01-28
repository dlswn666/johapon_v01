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
                <div className="flex gap-[12px] md:gap-[16px]">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[160px] md:w-[200px]">
                            <Skeleton className="w-[80px] h-[80px] rounded-[8px] md:rounded-[12px] mb-[8px] md:mb-[12px]" />
                            <Skeleton className="h-[14px] md:h-[16px] w-[100px] mb-[4px] md:mb-[6px]" />
                            <Skeleton className="h-[12px] md:h-[14px] w-[140px]" />
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
                <h3 className="font-semibold text-[14px] md:text-[16px] tracking-wider uppercase text-black">
                    PARTNERSHIPS
                </h3>
                <Link
                    href={`/${slug}/communication/partner`}
                    className={cn(
                        'flex items-center gap-[4px] text-[12px] md:text-[14px] text-gray-500 hover:text-[#4E8C6D] transition-colors',
                        'outline-none focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2 rounded-sm'
                    )}
                >
                    <span>함께하는 협력 업체입니다</span>
                    <ChevronRight className="w-[12px] h-[12px] md:w-[14px] md:h-[14px]" />
                </Link>
            </div>

            {/* 카드 컨테이너 - 가로 스크롤 */}
            <div
                className={cn(
                    'flex gap-[12px] md:gap-[16px] overflow-x-auto snap-x snap-mandatory',
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
                            'flex-shrink-0 w-[160px] md:w-[200px] snap-start',
                            'group cursor-pointer',
                            'outline-none focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2 rounded-[8px]'
                        )}
                    >
                        {/* 썸네일 */}
                        <div className="relative w-[80px] h-[80px] rounded-[8px] md:rounded-[12px] overflow-hidden bg-gray-100 mb-[8px] md:mb-[12px]">
                            {partner.image_url ? (
                                <Image
                                    src={partner.image_url}
                                    alt={partner.title || partner.business_name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    sizes="80px"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#4E8C6D]/20 to-[#4E8C6D]/5">
                                    <span className="text-[24px] md:text-[28px] font-bold text-[#4E8C6D]/40">
                                        {(partner.title || partner.business_name).charAt(0)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 제목 */}
                        <h4 className="font-medium text-[14px] md:text-[16px] text-black truncate group-hover:text-[#4E8C6D] transition-colors">
                            {partner.title || partner.business_name}
                        </h4>

                        {/* 설명 */}
                        {partner.content && (
                            <p className="text-[12px] md:text-[14px] text-gray-500 line-clamp-2 mt-[2px] md:mt-[4px]">
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
