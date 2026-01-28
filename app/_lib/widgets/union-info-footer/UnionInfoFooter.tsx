'use client';

import React from 'react';
import { Union } from '@/app/_lib/shared/type/database.types';
import { cn } from '@/lib/utils';

interface UnionInfoFooterProps {
    union: Union;
    className?: string;
}

const placeholderText = '텍스트가 없습니다.';

export function UnionInfoFooter({ union, className }: UnionInfoFooterProps) {
    // 서버/클라이언트 모두 동일한 현재 연도 사용
    const currentYear = new Date().getFullYear();

    return (
        <footer className={cn('bg-[#374151] text-white w-full py-[48px]', className)}>
            <div className="max-w-[984px] mx-auto px-[16px] md:px-[32px] lg:px-[64px]">
                {/* 3열 정보 섹션 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-[32px] lg:gap-[64px] mb-[32px]">
                    {/* 조합 소개 */}
                    <div className="flex flex-col gap-[16px]">
                        <h3 className="text-[18px] font-semibold text-white">{union.name}</h3>
                        <p className="text-[14px] text-[#D1D5DB] leading-[22px] whitespace-pre-wrap">
                            {union.description || placeholderText}
                        </p>
                    </div>

                    {/* 연락처 */}
                    <div className="flex flex-col gap-[16px]">
                        <h4 className="text-[18px] font-semibold text-white">연락처</h4>
                        <div className="flex flex-col gap-[8px] text-[14px] text-[#D1D5DB]">
                            <p>
                                전화:{' '}
                                {union.phone ? (
                                    <a
                                        href={`tel:${union.phone.replace(/-/g, '')}`}
                                        className="hover:text-white transition-colors cursor-pointer"
                                    >
                                        {union.phone}
                                    </a>
                                ) : (
                                    placeholderText
                                )}
                            </p>
                            <p>
                                이메일:{' '}
                                {union.email ? (
                                    <a
                                        href={`mailto:${union.email}`}
                                        className="hover:text-white transition-colors cursor-pointer"
                                    >
                                        {union.email}
                                    </a>
                                ) : (
                                    placeholderText
                                )}
                            </p>
                            <p>운영시간: {union.business_hours || placeholderText}</p>
                        </div>
                    </div>

                    {/* 오시는 길 */}
                    <div className="flex flex-col gap-[16px]">
                        <h4 className="text-[18px] font-semibold text-white">오시는 길</h4>
                        <p className="text-[14px] text-[#D1D5DB] leading-[22px] whitespace-pre-wrap">
                            {union.office_address || placeholderText}
                        </p>
                    </div>
                </div>

                {/* 사업자 정보 */}
                <div className="border-t border-gray-600 pt-[24px] mt-[24px]">
                    <div className="text-[12px] text-[#9CA3AF] text-center space-y-[4px]">
                        <p>상호: 라텔 | 대표: 정인주 | 사업자등록번호: 276-40-01354</p>
                        <p>주소: 서울특별시 강북구 인수봉로 6가길 9</p>
                        <p>
                            전화:{' '}
                            <a href="tel:01035048164" className="hover:text-white transition-colors cursor-pointer">
                                010-3504-8164
                            </a>
                            {' | '}
                            이메일:{' '}
                            <a
                                href="mailto:injostar@naver.com"
                                className="hover:text-white transition-colors cursor-pointer"
                            >
                                injostar@naver.com
                            </a>
                        </p>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-[32px]">
                    <p className="text-[12px] text-[#9CA3AF] text-center" suppressHydrationWarning>
                        © {currentYear} {union.name}. All rights reserved. | Powered by 조합온
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default UnionInfoFooter;
