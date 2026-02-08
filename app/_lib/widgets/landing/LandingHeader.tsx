'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, Menu, X as XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LandingHeaderProps {
    unionName: string;
    className?: string;
}

/**
 * 조합 랜딩 페이지 헤더
 * 피그마: Header (907:734) - 1920×120px
 * 
 * 구조:
 * - Logo: 아이콘 + 조합명
 * - NavMenu: 조합 소개 | 재개발 소개 | 커뮤니티
 * - UserMenu: 내정보
 */
export function LandingHeader({ unionName, className }: LandingHeaderProps) {
    const navItems = [
        { label: '조합 소개', href: '#about' },
        { label: '재개발 소개', href: '#redevelopment' },
        { label: '커뮤니티', href: '#community' },
    ];

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <header 
            className={cn(
                'w-full h-auto min-h-[70px] md:min-h-[120px]',
                'bg-white',
                'border-b border-[#CDD1D5]',
                'sticky top-0 z-50',
                className
            )}
        >
            <div className="max-w-[1200px] h-full mx-auto px-4 md:px-6">
                <nav className="h-full flex items-center justify-between">
                    {/* Logo */}
                    <Link 
                        href="/" 
                        className="flex items-center gap-2 md:gap-3 group"
                    >
                        {/* Logo Icon - 피그마: 907:738 */}
                        <div 
                            className={cn(
                                'w-8 h-8 md:w-10 md:h-10',
                                'bg-[#2F7F5F]',
                                'rounded-lg',
                                'flex items-center justify-center',
                                'transition-transform group-hover:scale-105'
                            )}
                        >
                            <svg 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                className="w-5 h-5 md:w-6 md:h-6 text-white"
                            >
                                <path 
                                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        {/* Logo Text - 피그마: 907:741 */}
                        <span 
                            className={cn(
                                'font-bold text-[#333641]',
                                'text-lg md:text-2xl',
                                'transition-colors group-hover:text-[#2F7F5F]'
                            )}
                        >
                            {unionName}
                        </span>
                    </Link>

                    {/* Navigation Menu - 피그마: 907:742 */}
                    <div className="hidden md:flex items-center gap-8 lg:gap-12">
                        {navItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    'text-[#333641] font-semibold',
                                    'text-base lg:text-lg',
                                    'hover:text-[#2F7F5F]',
                                    'transition-colors',
                                    'relative',
                                    'after:absolute after:bottom-[-4px] after:left-0',
                                    'after:w-0 after:h-[2px] after:bg-[#2F7F5F]',
                                    'after:transition-all hover:after:w-full'
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* User Menu - 피그마: 907:746 */}
                    <div className="flex items-center gap-2">
                        <Link
                            href="#login"
                            className={cn(
                                'flex items-center gap-2',
                                'text-[#333641] font-semibold',
                                'text-sm md:text-base',
                                'hover:text-[#2F7F5F]',
                                'transition-colors'
                            )}
                        >
                            <div
                                className={cn(
                                    'w-8 h-8 md:w-9 md:h-9',
                                    'bg-[#2F7F5F]/10',
                                    'rounded-full',
                                    'flex items-center justify-center'
                                )}
                            >
                                <User className="w-4 h-4 md:w-5 md:h-5 text-[#2F7F5F]" />
                            </div>
                            <span className="hidden sm:inline">내정보</span>
                        </Link>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="메뉴"
                        >
                            {isMobileMenuOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </nav>
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 bg-white px-4 py-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="block py-3 text-[#333641] font-semibold hover:text-[#2F7F5F] transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );
}

export default LandingHeader;
