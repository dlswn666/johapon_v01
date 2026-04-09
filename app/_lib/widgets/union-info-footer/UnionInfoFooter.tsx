'use client';

import React from 'react';
import { Phone, Mail, Clock, MapPin } from 'lucide-react';
import { Union } from '@/app/_lib/shared/type/database.types';
import { cn } from '@/lib/utils';

interface UnionInfoFooterProps {
    union: Union;
    className?: string;
}

export function UnionInfoFooter({ union, className }: UnionInfoFooterProps) {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={cn('bg-primary w-full', className)}>
            <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-14">
                {/* 상단: 3열 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-8 md:gap-12">
                    {/* 브랜드 */}
                    <div>
                        <h3 className="text-[22px] font-bold text-white tracking-[0.5px] mb-4">
                            {union.name}
                        </h3>
                        {union.description && (
                            <p className="text-sm text-white/75 font-light leading-[1.7] whitespace-pre-line">
                                {union.description}
                            </p>
                        )}
                    </div>

                    {/* 연락처 */}
                    <div>
                        <p className="text-xs font-medium text-white/60 tracking-[2px] uppercase mb-4">
                            연락처
                        </p>
                        <ul className="flex flex-col gap-2.5">
                            {union.phone && (
                                <li>
                                    <a
                                        href={`tel:${union.phone.replace(/-/g, '')}`}
                                        className="inline-flex items-center gap-2 text-sm text-white/85 font-light hover:text-emerald-400 transition-colors"
                                    >
                                        <Phone className="size-4 opacity-60 shrink-0" />
                                        {union.phone}
                                    </a>
                                </li>
                            )}
                            {union.email && (
                                <li>
                                    <a
                                        href={`mailto:${union.email}`}
                                        className="inline-flex items-center gap-2 text-sm text-white/85 font-light hover:text-emerald-400 transition-colors"
                                    >
                                        <Mail className="size-4 opacity-60 shrink-0" />
                                        {union.email}
                                    </a>
                                </li>
                            )}
                            {union.business_hours && (
                                <li className="inline-flex items-center gap-2 text-sm text-white/85 font-light">
                                    <Clock className="size-4 opacity-60 shrink-0" />
                                    {union.business_hours}
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* 오시는 길 */}
                    {union.office_address && (
                        <div>
                            <p className="text-xs font-medium text-white/60 tracking-[2px] uppercase mb-4">
                                오시는 길
                            </p>
                            <ul className="flex flex-col gap-2.5">
                                <li className="inline-flex items-center gap-2 text-sm text-white/85 font-light">
                                    <MapPin className="size-4 opacity-60 shrink-0" />
                                    {union.office_address}
                                </li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* 하단: 사업자 정보 + 저작권 */}
                <div className="mt-10 pt-6 border-t border-white/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <p className="text-xs text-white/45 font-light leading-[1.6]">
                        라텔 · 대표 정인주 · 사업자등록번호 276-40-01354
                        <br className="md:hidden" />
                        <span className="hidden md:inline"> · </span>
                        서울특별시 강북구 인수봉로 6가길 9
                    </p>
                    <p className="text-xs text-white/45 font-light" suppressHydrationWarning>
                        © {currentYear} {union.name} · Powered by <span className="text-white/70 font-medium">조합온</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default UnionInfoFooter;
