'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

interface NavSubItem {
    href: string;
    label: string;
}

interface NavItem {
    id: string;
    label: string;
    href?: string;
    subItems?: NavSubItem[];
}

export default function UnionNavigation() {
    const pathname = usePathname();
    const { slug } = useSlug();
    const { isAdmin } = useAuth();

    // 일반 메뉴
    const navItems: NavItem[] = [
        { id: 'home', label: '홈', href: `/${slug}` },
        {
            id: 'news',
            label: '조합 소식',
            subItems: [
                { href: `/${slug}/news/notice`, label: '공지사항' },
                { href: `/${slug}/news/qna`, label: '질문 게시판' },
            ],
        },
        {
            id: 'communication',
            label: '소통방',
            subItems: [
                { href: `/${slug}/communication/union-info`, label: '조합 정보 공유' },
                { href: `/${slug}/communication/free-board`, label: '자유 게시판' },
                { href: `/${slug}/communication/partner`, label: '협력 업체' },
            ],
        },
    ];

    // 관리자 전용 메뉴 (회원/사용자 관리를 조합원 관리로 통합)
    const adminNavItem: NavItem = {
        id: 'admin',
        label: '관리자',
        subItems: [
            { href: `/${slug}/admin/slides`, label: '슬라이드 관리' },
            { href: `/${slug}/admin/alimtalk`, label: '알림톡 내역' },
            { href: `/${slug}/admin/members`, label: '조합원 관리' },
        ],
    };

    // 현재 경로가 메뉴 항목과 일치하는지 확인
    const isActiveRoute = (href: string) => {
        return pathname === href || pathname.startsWith(href + '/');
    };

    // 서브메뉴 중 하나라도 활성화되어 있는지 확인
    const hasActiveSubItem = (subItems?: NavSubItem[]) => {
        if (!subItems) return false;
        return subItems.some((item) => isActiveRoute(item.href));
    };

    return (
        <NavigationMenu className="hidden md:flex">
            <NavigationMenuList className="gap-2">
                {navItems.map((item) => (
                    <NavigationMenuItem key={item.id}>
                        {item.subItems ? (
                            <>
                                <NavigationMenuTrigger
                                    className={cn(
                                        'h-[56px] px-4 text-[16px] font-medium bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent',
                                        hasActiveSubItem(item.subItems)
                                            ? 'text-[#4E8C6D] font-bold'
                                            : 'text-[#CCCCCC] hover:text-[#4E8C6D]'
                                    )}
                                >
                                    {item.label}
                                </NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="w-[180px] p-2">
                                        {item.subItems.map((subItem) => (
                                            <li key={subItem.href}>
                                                <NavigationMenuLink asChild>
                                                    <Link
                                                        href={subItem.href}
                                                        className={cn(
                                                            'block px-3 py-2 text-[14px] rounded-md transition-colors',
                                                            isActiveRoute(subItem.href)
                                                                ? 'bg-[#4E8C6D]/10 text-[#4E8C6D] font-medium'
                                                                : 'text-gray-600 hover:bg-gray-100'
                                                        )}
                                                    >
                                                        {subItem.label}
                                                    </Link>
                                                </NavigationMenuLink>
                                            </li>
                                        ))}
                                    </ul>
                                </NavigationMenuContent>
                            </>
                        ) : (
                            <Link
                                href={item.href || '#'}
                                className={cn(
                                    'h-[56px] flex items-center px-4 text-[16px] font-medium transition-colors border-b-4',
                                    isActiveRoute(item.href || '')
                                        ? 'text-[#4E8C6D] border-[#4E8C6D] font-bold'
                                        : 'text-[#CCCCCC] border-transparent hover:text-[#4E8C6D]'
                                )}
                            >
                                {item.label}
                            </Link>
                        )}
                    </NavigationMenuItem>
                ))}

                {/* 관리자 전용 메뉴 */}
                {isAdmin && (
                    <NavigationMenuItem>
                        <NavigationMenuTrigger
                            className={cn(
                                'h-[56px] px-4 text-[16px] font-medium bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent',
                                hasActiveSubItem(adminNavItem.subItems)
                                    ? 'text-[#4E8C6D] font-bold'
                                    : 'text-[#CCCCCC] hover:text-[#4E8C6D]'
                            )}
                        >
                            {adminNavItem.label}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                            <ul className="w-[180px] p-2">
                                {adminNavItem.subItems?.map((subItem) => (
                                    <li key={subItem.href}>
                                        <NavigationMenuLink asChild>
                                            <Link
                                                href={subItem.href}
                                                className={cn(
                                                    'block px-3 py-2 text-[14px] rounded-md transition-colors',
                                                    isActiveRoute(subItem.href)
                                                        ? 'bg-[#4E8C6D]/10 text-[#4E8C6D] font-medium'
                                                        : 'text-gray-600 hover:bg-gray-100'
                                                )}
                                            >
                                                {subItem.label}
                                            </Link>
                                        </NavigationMenuLink>
                                    </li>
                                ))}
                            </ul>
                        </NavigationMenuContent>
                    </NavigationMenuItem>
                )}
            </NavigationMenuList>
        </NavigationMenu>
    );
}
