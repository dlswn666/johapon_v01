'use client';

import React from 'react';
import { Union } from '@/app/_lib/shared/type/database.types';
import { cn } from '@/lib/utils';

interface UnionInfoFooterProps {
    union: Union;
    className?: string;
}

export function UnionInfoFooter({ union, className }: UnionInfoFooterProps) {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={cn('bg-[#2f7f5f] w-full', className)}>
            <div className="max-w-[1200px] mx-auto px-[16px] md:px-[24px] py-[36px] md:py-[50px]">
                {/* 상단: 조합 이름 + 연락처/오시는길/운영시간 */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-[12px] md:gap-[28px]">
                    <h3 className="text-[20px] md:text-[24px] font-bold text-white tracking-[1px] leading-[1.2] shrink-0">
                        {union.name}
                    </h3>
                    <div className="flex flex-col md:flex-row flex-wrap gap-[6px] md:gap-[20px] text-[15px] md:text-[16px] text-white font-light leading-[1.5]">
                        {union.phone && (
                            <span>
                                전화:{' '}
                                <a href={`tel:${union.phone.replace(/-/g, '')}`} className="hover:text-white transition-colors">
                                    {union.phone}
                                </a>
                            </span>
                        )}
                        {union.email && (
                            <span>
                                이메일:{' '}
                                <a href={`mailto:${union.email}`} className="hover:text-white transition-colors">
                                    {union.email}
                                </a>
                            </span>
                        )}
                        {union.office_address && (
                            <span>오시는 길: {union.office_address}</span>
                        )}
                        {union.business_hours && (
                            <span>운영시간: {union.business_hours}</span>
                        )}
                    </div>
                </div>

                {/* 구분선 */}
                <div className="border-t border-white/20 mt-[20px] md:mt-[19px]" />

                {/* 사업자 정보 - 1열 */}
                <div className="mt-[16px] md:mt-[19px] text-[13px] md:text-[14px] text-white font-light leading-[1.4] text-center">
                    <p>
                        상호 라텔 | 대표 정인주 | 사업자등록번호 : 276-40-01354 | 주소 : 서울특별시 강북구 인수봉로 6가길 9 | 이메일 : injostar@naver.com | 전화 : 010-3504-8164
                    </p>
                </div>

                {/* 카피라이트 */}
                <p className="mt-[16px] md:mt-[19px] text-[13px] md:text-[14px] text-white font-light leading-[1.4] text-center" suppressHydrationWarning>
                    © {currentYear} {union.name}. All rights reserved. | Powered by 조합온
                </p>
            </div>
        </footer>
    );
}

export default UnionInfoFooter;
