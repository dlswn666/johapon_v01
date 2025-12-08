'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

export default function UnionNavigation() {
    const pathname = usePathname();
    const { slug } = useSlug();
    
    const navItems = [
        { href: `/${slug}`, label: '홈' },
        { href: `/${slug}/notice`, label: '공지사항' },
        { href: `/${slug}/free-board`, label: '자유 게시판' },
        { href: `/${slug}/dashboard`, label: '알림톡 관리' },
    ];

    return (
        <nav className="flex items-center space-x-8">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'h-[56px] flex items-center px-2 text-[16px] font-medium transition-colors border-b-4',
                            isActive 
                                ? 'text-[#4E8C6D] border-[#4E8C6D] font-bold' 
                                : 'text-[#CCCCCC] border-transparent hover:text-[#4E8C6D]'
                        )}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}

