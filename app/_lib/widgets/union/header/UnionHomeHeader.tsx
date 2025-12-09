'use client';

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Home, User, ChevronDown, LogOut, UserCircle, PanelLeft } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import UnionMobileSidebar from './UnionMobileSidebar';

export default function UnionHomeHeader() {
    const { union } = useSlug();
    const { user, isSystemAdmin, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // 드롭다운 상태 관리
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    // 모바일 사이드바 상태 관리
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // 외부 클릭 감지를 위한 ref
    const userMenuRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 사용자 메뉴 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };

        if (isUserMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isUserMenuOpen]);

    // 네비게이션 메뉴 구조
    const navigationItems = [
        {
            id: 'news',
            label: '조합 소식',
            href: `/${union?.slug || ''}/news`,
            subItems: [
                { label: '공지사항', href: `/${union?.slug || ''}/news/notice` },
                { label: '질문 게시판', href: `/${union?.slug || ''}/news/qna` },
            ],
        },
        {
            id: 'communication',
            label: '소통방',
            href: `/${union?.slug || ''}/communication`,
            subItems: [
                { label: '조합 정보 공유', href: `/${union?.slug || ''}/communication/union-info` },
                { label: '자유 게시판', href: `/${union?.slug || ''}/communication/free-board` },
            ],
        },
        {
            id: 'admin',
            label: '관리자',
            href: `/${union?.slug || ''}/admin`,
            subItems: [
                { label: '슬라이드 관리', href: `/${union?.slug || ''}/admin/slides` },
            ],
        },
    ];

    // 시스템 관리자 메뉴 추가
    if (isSystemAdmin) {
        navigationItems.push({
            id: 'system-admin',
            label: '시스템 관리',
            href: '/admin/unions',
            subItems: [{ label: '조합 관리', href: '/admin/unions' }],
        });
    }

    // 현재 경로가 메뉴 항목과 일치하는지 확인
    const isActiveRoute = (href: string) => {
        return pathname === href || pathname.startsWith(href + '/');
    };

    // 사용자 메뉴 토글
    const toggleUserMenu = () => {
        setIsUserMenuOpen(!isUserMenuOpen);
    };

    // 로그아웃 처리
    const handleLogout = () => {
        logout();
        setIsUserMenuOpen(false);
        router.push('/');
    };

    // 사이드바 토글
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    if (!union) return null;

    return (
        <>
            <header className="bg-white border-b border-gray-200 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                {/* 모바일 헤더 (md 미만) */}
                <div className="h-[60px] md:hidden relative">
                    <div className="container mx-auto px-4 h-full flex items-center justify-between">
                        {/* 왼쪽: 사이드바 토글 버튼 */}
                        <button
                            onClick={toggleSidebar}
                            className="size-[40px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            aria-label="메뉴 열기"
                        >
                            <PanelLeft className="size-[24px] text-[#4e8c6d]" />
                        </button>

                        {/* 중앙: 조합 로고 + 조합명 */}
                        <div
                            onClick={() => router.push(`/${union.slug}`)}
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <div className="bg-[#4e8c6d] rounded-full size-[36px] flex items-center justify-center shrink-0 relative overflow-hidden">
                                {union.logo_url ? (
                                    <Image
                                        src={union.logo_url}
                                        alt={`${union.name} 로고`}
                                        fill
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    <Home className="size-[18px] text-white" />
                                )}
                            </div>
                            <p className="text-[14px] font-bold text-[#4e8c6d] max-w-[120px] truncate">{union.name}</p>
                        </div>

                        {/* 오른쪽: 빈 공간 (균형을 위해) */}
                        <div className="size-[40px]" />
                    </div>
                </div>

                {/* 데스크탑 헤더 (md 이상) */}
                <div className="h-[90px] hidden md:block relative">
                    <div className="container mx-auto px-4 h-full flex items-center justify-between">
                        {/* 왼쪽: 로고 영역 */}
                        <div
                            onClick={() => router.push(`/${union.slug}`)}
                            className="flex items-center gap-[13.5px] cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <div className="bg-[#4e8c6d] rounded-full size-[54px] flex items-center justify-center shrink-0 relative overflow-hidden">
                                {union.logo_url ? (
                                    <Image
                                        src={union.logo_url}
                                        alt={`${union.name} 로고`}
                                        fill
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    <Home className="size-[27px] text-white" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <p className="text-[15.75px] leading-[22.5px] text-[#4a5565]">서울 신동아</p>
                                <p className="text-[18px] leading-[27px] font-bold text-[#4e8c6d]">{union.name}</p>
                            </div>
                        </div>

                        {/* 중앙: 네비게이션 - shadcn NavigationMenu 적용 */}
                        <NavigationMenu viewport={false} className="flex items-center">
                            <NavigationMenuList className="gap-[9px]">
                                {navigationItems.map((item) => (
                                    <NavigationMenuItem key={item.id}>
                                        {item.subItems.length > 0 ? (
                                            // 하위 메뉴가 있는 경우 - Trigger 사용
                                            <>
                                                <NavigationMenuTrigger
                                                    className={cn(
                                                        'cursor-pointer h-[54px] px-[27px] py-[13.5px] rounded-[13.5px] text-[18px] leading-[27px] text-neutral-950 font-normal bg-transparent',
                                                        'hover:bg-gray-50 focus:bg-gray-50 data-[state=open]:bg-gray-100',
                                                        isActiveRoute(item.href) && 'bg-gray-100'
                                                    )}
                                                    onClick={(e) => e.preventDefault()}
                                                    onPointerDown={(e) => e.preventDefault()}
                                                >
                                                    {item.label}
                                                </NavigationMenuTrigger>
                                                <NavigationMenuContent className="min-w-[180px]">
                                                    <ul className="p-0">
                                                        {item.subItems.map((subItem) => (
                                                            <li key={subItem.href}>
                                                                <NavigationMenuLink asChild>
                                                                    <Link
                                                                        href={subItem.href}
                                                                        className={cn(
                                                                            'block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer',
                                                                            pathname === subItem.href &&
                                                                                'bg-gray-50 font-medium'
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
                                            // 하위 메뉴가 없는 경우 - 직접 링크
                                            <NavigationMenuLink asChild>
                                                <Link
                                                    href={item.href}
                                                    className={cn(
                                                        'h-[54px] px-[27px] py-[13.5px] rounded-[13.5px] flex items-center text-[18px] leading-[27px] text-neutral-950 transition-colors cursor-pointer',
                                                        isActiveRoute(item.href) ? 'bg-gray-100' : 'hover:bg-gray-50'
                                                    )}
                                                >
                                                    {item.label}
                                                </Link>
                                            </NavigationMenuLink>
                                        )}
                                    </NavigationMenuItem>
                                ))}
                            </NavigationMenuList>
                        </NavigationMenu>

                        {/* 오른쪽: 사용자 아이콘 영역 */}
                        <div className="relative" ref={userMenuRef} onMouseLeave={() => setIsUserMenuOpen(false)}>
                            <button
                                onClick={toggleUserMenu}
                                className="h-[45px] px-[18px] py-0 rounded-[13.5px] flex items-center gap-[9px] hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <div className="size-[27px] flex items-center justify-center">
                                    {user ? (
                                        <UserCircle className="size-[27px] text-[#4e8c6d]" />
                                    ) : (
                                        <User className="size-[27px] text-[#4e8c6d]" />
                                    )}
                                </div>
                                <ChevronDown className="size-[18px] text-[#4e8c6d]" />
                            </button>

                            {/* 사용자 메뉴 드롭다운 */}
                            {isUserMenuOpen && (
                                <div
                                    className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]"
                                    onMouseEnter={() => setIsUserMenuOpen(true)}
                                    onMouseLeave={() => setIsUserMenuOpen(false)}
                                >
                                    <Link
                                        href="/profile"
                                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-t-lg cursor-pointer"
                                        onClick={() => setIsUserMenuOpen(false)}
                                    >
                                        내정보
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-b-lg flex items-center gap-2 cursor-pointer"
                                    >
                                        <LogOut className="size-4" />
                                        로그아웃
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* 모바일 사이드바 */}
            <UnionMobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </>
    );
}
