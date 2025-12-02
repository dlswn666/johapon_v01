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
        { href: `/${slug}/dashboard`, label: '알림톡 관리' },
    ];

    return (
        <nav className="flex items-center space-x-6">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'text-sm font-medium transition-colors hover:text-blue-600',
                            isActive ? 'text-blue-600 font-bold' : 'text-gray-600'
                        )}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}

