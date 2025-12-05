'use client';

import React from 'react';
import { Union } from '@/app/_lib/shared/type/database.types';
import { cn } from '@/lib/utils';

interface UnionInfoFooterProps {
    union: Union;
    className?: string;
}

/**
 * 조합 정보 Footer 섹션
 * - 전화번호, 주소, 이메일, 운영시간 표시
 * - 조합 소개 표시
 * - 정보가 없으면 "작성중" 표시
 */
export function UnionInfoFooter({ union, className }: UnionInfoFooterProps) {
    const placeholderText = '작성중';

    return (
        <footer className={cn('bg-[#1e2939] text-white w-full py-[37px]', className)}>
            <div className="container mx-auto max-w-[1280px] px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-[37px]">
                    {/* 조합 소개 */}
                    <div className="flex flex-col gap-[18px]">
                        <div className="flex items-center gap-3">
                            {union.logo_url && (
                                <img
                                    src={union.logo_url}
                                    alt={`${union.name} 로고`}
                                    className="h-8 w-auto object-contain brightness-0 invert"
                                />
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
                            {union.address || placeholderText}
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-[#364153] pt-[37px]">
                    <p className="text-[#99a1af] text-[15.75px] text-center leading-[23.625px]">
                        © {new Date().getFullYear()} {union.name}. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default UnionInfoFooter;
