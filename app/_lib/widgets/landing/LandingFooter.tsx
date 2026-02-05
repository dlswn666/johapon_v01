'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Phone, Mail, MapPin } from 'lucide-react';

interface LandingFooterProps {
    unionName: string;
    address?: string;
    phone?: string;
    email?: string;
    className?: string;
}

/**
 * 조합 랜딩 페이지 푸터
 * 피그마: Footer (868:7601) - 1814×268px
 * 
 * 디자인:
 * - 배경색: #4F6D61 (브랜드 Secondary)
 * - 패딩: 10px
 * - 레이아웃: Horizontal, center aligned
 */
export function LandingFooter({ 
    unionName, 
    address = '서울특별시 강북구 미아동 000-00',
    phone = '02-0000-0000',
    email = 'contact@johap.on',
    className 
}: LandingFooterProps) {
    const currentYear = new Date().getFullYear();

    const footerLinks = [
        { label: '이용약관', href: '/terms' },
        { label: '개인정보처리방침', href: '/privacy' },
        { label: '문의하기', href: '/contact' },
    ];

    return (
        <footer 
            className={cn(
                'w-full',
                'bg-[#4F6D61]',
                'py-10 md:py-16',
                className
            )}
        >
            <div className="max-w-[1200px] mx-auto px-4 md:px-6">
                <div 
                    className={cn(
                        'grid grid-cols-1 md:grid-cols-3',
                        'gap-8 md:gap-12'
                    )}
                >
                    {/* 조합 정보 */}
                    <div className="text-center md:text-left">
                        <h3 className="text-white font-bold text-xl md:text-2xl mb-4">
                            {unionName}
                        </h3>
                        <p className="text-white/70 text-sm leading-relaxed">
                            조합원 여러분의 소중한 자산을 함께 지켜나가겠습니다.
                            투명한 정보 공개와 원활한 소통으로 
                            성공적인 재개발 사업을 이끌어 가겠습니다.
                        </p>
                    </div>

                    {/* 연락처 정보 */}
                    <div className="text-center md:text-left">
                        <h4 className="text-white font-semibold text-lg mb-4">
                            연락처
                        </h4>
                        <ul className="space-y-3">
                            <li className="flex items-center justify-center md:justify-start gap-3 text-white/80">
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span className="text-sm">{address}</span>
                            </li>
                            <li className="flex items-center justify-center md:justify-start gap-3 text-white/80">
                                <Phone className="w-4 h-4 shrink-0" />
                                <a 
                                    href={`tel:${phone.replace(/-/g, '')}`}
                                    className="text-sm hover:text-white transition-colors"
                                >
                                    {phone}
                                </a>
                            </li>
                            <li className="flex items-center justify-center md:justify-start gap-3 text-white/80">
                                <Mail className="w-4 h-4 shrink-0" />
                                <a 
                                    href={`mailto:${email}`}
                                    className="text-sm hover:text-white transition-colors"
                                >
                                    {email}
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* 빠른 링크 */}
                    <div className="text-center md:text-left">
                        <h4 className="text-white font-semibold text-lg mb-4">
                            바로가기
                        </h4>
                        <ul className="space-y-2">
                            {footerLinks.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className={cn(
                                            'text-white/70 text-sm',
                                            'hover:text-white',
                                            'transition-colors'
                                        )}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* 하단 구분선 및 저작권 */}
                <div 
                    className={cn(
                        'mt-10 pt-6',
                        'border-t border-white/20',
                        'text-center'
                    )}
                >
                    <p className="text-white/50 text-xs md:text-sm">
                        © {currentYear} {unionName}. All rights reserved.
                    </p>
                    <p className="text-white/40 text-xs mt-2">
                        Powered by <span className="font-semibold">조합온</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default LandingFooter;
