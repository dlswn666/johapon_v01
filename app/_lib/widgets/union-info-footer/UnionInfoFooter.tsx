'use client';

import React from 'react';
import Image from 'next/image';
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
        <footer className={cn('bg-[#1e2939] text-white w-full py-[37px]', className)}>
            <div className="container mx-auto max-w-[1280px] px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-[37px]">
                    {/* 조합 소개 */}
                    <div className="flex flex-col gap-[18px]">
                        <div className="flex items-center gap-3">
                            {union.logo_url && (
                                <div className="relative h-8 w-8">
                                    <Image
                                        src={union.logo_url}
                                        alt={`${union.name} 로고`}
                                        fill
                                        className="object-contain brightness-0 invert"
                                    />
                                </div>
                            )}
                            <h3 className="text-[22.5px] font-bold leading-[33.75px]">{union.name}</h3>
                        </div>
                        <div className="text-[#d1d5dc] text-[18px] leading-[30.6px] whitespace-pre-wrap">
                            {union.description || placeholderText}
                        </div>
                    </div>

                    {/* 연락처 */}
                    <div className="flex flex-col gap-[18px]">
                        <h4 className="text-[20.25px] font-bold leading-[30.375px]">연락처</h4>
                        <div className="flex flex-col gap-[9px] text-[#d1d5dc] text-[18px] leading-[27px]">
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
                    <div className="flex flex-col gap-[18px]">
                        <h4 className="text-[20.25px] font-bold leading-[30.375px]">오시는 길</h4>
                        <div className="text-[#d1d5dc] text-[18px] leading-[30.6px] whitespace-pre-wrap">
                            {union.office_address || placeholderText}
                        </div>
                    </div>
                </div>

                {/* 사업자 정보 */}
                <div className="border-t border-[#364153] pt-6 mt-6">
                    <div className="text-[#99a1af] text-sm text-center space-y-1">
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
                <div className="border-t border-[#364153] pt-6 mt-6">
                    <p className="text-[#99a1af] text-[15.75px] text-center leading-[23.625px]" suppressHydrationWarning>
                        © {currentYear} {union.name}. All rights reserved. | Powered by 조합온
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default UnionInfoFooter;
