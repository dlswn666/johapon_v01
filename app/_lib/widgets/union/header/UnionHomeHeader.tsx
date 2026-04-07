'use client';

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, User, ChevronDown, LogOut, UserCircle, PanelLeft, MapPin } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { NavigationMenu } from '@base-ui/react/navigation-menu';
import { cn } from '@/lib/utils';
import UnionMobileSidebar from './UnionMobileSidebar';

// Next.js Link를 Base UI NavigationMenu.Link와 통합
function NavLink(props: NavigationMenu.Link.Props & { href: string }) {
    return <NavigationMenu.Link render={<Link href={props.href} />} {...props} />;
}

export default function UnionHomeHeader() {
    const { union } = useSlug();
    const { user, isAdmin, isSystemAdmin, logout } = useAuth();
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
                { label: '협력 업체', href: `/${union?.slug || ''}/communication/partner` },
            ],
        },
    ];

    // 총회 관리 메뉴 (조합 관리자 이상만 볼 수 있음)
    if (isAdmin) {
        navigationItems.push({
            id: 'assembly-management',
            label: '총회 관리',
            href: `/${union?.slug || ''}/admin/assembly`,
            subItems: [
                { label: '전자투표', href: `/${union?.slug || ''}/admin/assembly/evote` },
                { label: '온라인 총회', href: `/${union?.slug || ''}/admin/assembly` },
            ],
        });
    }

    // 관리자 메뉴 (조합 관리자 이상만 볼 수 있음)
    if (isAdmin) {
        navigationItems.push({
            id: 'admin',
            label: '관리자',
            href: `/${union?.slug || ''}/admin`,
            subItems: [
                { label: '조합 정보 설정', href: `/${union?.slug || ''}/admin/settings` },
                { label: '슬라이드 관리', href: `/${union?.slug || ''}/admin/slides` },
                { label: '알림톡 내역', href: `/${union?.slug || ''}/admin/alimtalk` },
                { label: '문자 발송', href: `/${union?.slug || ''}/admin/sms` },
                { label: '조합원 관리', href: `/${union?.slug || ''}/admin/members` },
                { label: '동의율 관리', href: `/${union?.slug || ''}/admin/land-lots` },
            ],
        });
    }

    // 시스템 관리자 메뉴 추가 (시스템 관리자만 볼 수 있음)
    if (isSystemAdmin) {
        navigationItems.push({
            id: 'system-admin',
            label: '시스템 관리',
            href: '/systemAdmin',
            subItems: [
                { label: '대시보드', href: '/systemAdmin' },
                { label: '조합 관리', href: '/systemAdmin/unions' },
            ],
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
    };

    // 사이드바 토글
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    if (!union) return null;

    return (
        <>
            <header className="bg-white border-b border-gray-200 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
                {/* 모바일/태블릿 헤더 (lg 미만) */}
                <div className="lg:hidden relative safe-top" style={{ height: 'calc(60px + env(safe-area-inset-top, 0px))' }}>
                    <div className="w-full mx-auto px-[16px] h-full flex items-center justify-between">
                        {/* 왼쪽: 사이드바 토글 버튼 */}
                        <button
                            onClick={toggleSidebar}
                            className="size-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2 outline-none"
                            aria-label="메뉴 열기"
                            aria-expanded={isSidebarOpen}
                            aria-controls="mobile-sidebar"
                        >
                            <PanelLeft className="size-[24px] text-[#4e8c6d]" aria-hidden="true" />
                        </button>

                        {/* 중앙: 조합 로고 + 조합명 */}
                        <Link
                            href={`/${union.slug}`}
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 hover:opacity-80 transition-opacity"
                            aria-label={`${union.name} 홈으로 이동`}
                        >
                            <div className="bg-[#4e8c6d] rounded-full size-[36px] flex items-center justify-center shrink-0 relative overflow-hidden">
                                {union.logo_url ? (
                                    <Image
                                        src={union.logo_url}
                                        alt={`${union.name} 로고`}
                                        fill
                                        sizes="36px"
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    <Home className="size-[18px] text-white" aria-hidden="true" />
                                )}
                            </div>
                            <p className="text-[14px] font-bold text-[#4e8c6d] max-w-[120px] truncate">{union.name}</p>
                        </Link>

                        {/* 오른쪽: 빈 공간 (균형을 위해) */}
                        <div className="size-[44px]" aria-hidden="true" />
                    </div>
                </div>

                {/* 데스크탑 헤더 (lg 이상) */}
                <div className="h-16 hidden lg:block relative">
                    <div className="container mx-auto px-4 h-full flex items-center justify-between">
                        {/* 왼쪽: 로고 영역 */}
                        <Link
                            href={`/${union.slug}`}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            aria-label={`${union.name} 홈으로 이동`}
                        >
                            <div className="bg-[#4e8c6d] rounded-full size-10 flex items-center justify-center shrink-0 relative overflow-hidden">
                                {union.logo_url ? (
                                    <Image
                                        src={union.logo_url}
                                        alt={`${union.name} 로고`}
                                        fill
                                        sizes="40px"
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    <Home className="size-5 text-white" aria-hidden="true" />
                                )}
                            </div>
                            <p className="text-base font-bold text-[#4e8c6d] max-w-[200px] truncate" title={union.name}>{union.name}</p>
                        </Link>

                        {/* 중앙: 네비게이션 - Base UI NavigationMenu */}
                        <NavigationMenu.Root className="flex items-center">
                            <NavigationMenu.List className="flex items-center gap-1">
                                {navigationItems.map((item) => (
                                    <NavigationMenu.Item key={item.id} value={item.id}>
                                        {item.subItems.length > 0 ? (
                                            <>
                                                <NavigationMenu.Trigger
                                                    className={cn(
                                                        'cursor-pointer h-[44px] px-5 rounded-lg text-[16px] leading-[24px] text-neutral-700 font-medium bg-transparent inline-flex items-center gap-1.5',
                                                        'hover:bg-gray-50 hover:text-neutral-900 transition-colors',
                                                        'focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2 outline-none',
                                                        'data-[popup-open]:bg-gray-100 data-[popup-open]:text-neutral-900',
                                                        isActiveRoute(item.href) && 'bg-gray-100 text-neutral-900'
                                                    )}
                                                >
                                                    {item.label}
                                                    <NavigationMenu.Icon className="nav-trigger-icon">
                                                        <ChevronDown className="size-4 text-gray-400" aria-hidden="true" />
                                                    </NavigationMenu.Icon>
                                                </NavigationMenu.Trigger>
                                                <NavigationMenu.Content className="nav-content">
                                                    <ul className="min-w-[180px]">
                                                        {item.subItems.map((subItem) => (
                                                            <li key={subItem.href}>
                                                                <NavLink
                                                                    href={subItem.href}
                                                                    active={pathname === subItem.href}
                                                                    className={cn(
                                                                        'block px-4 py-2.5 text-[14px] text-gray-600 rounded-lg transition-colors cursor-pointer',
                                                                        'hover:bg-gray-50 hover:text-gray-900',
                                                                        'focus-visible:bg-gray-50 focus-visible:outline-none',
                                                                        'data-[active]:bg-[#4E8C6D]/5 data-[active]:text-[#4E8C6D] data-[active]:font-medium',
                                                                        'data-[active]:border-l-2 data-[active]:border-[#4E8C6D] data-[active]:pl-3.5'
                                                                    )}
                                                                >
                                                                    {subItem.label}
                                                                </NavLink>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </NavigationMenu.Content>
                                            </>
                                        ) : (
                                            <NavLink
                                                href={item.href}
                                                active={isActiveRoute(item.href)}
                                                className={cn(
                                                    'h-[44px] px-5 rounded-lg flex items-center text-[16px] leading-[24px] text-neutral-700 font-medium transition-colors cursor-pointer',
                                                    'hover:bg-gray-50 hover:text-neutral-900',
                                                    'focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2 outline-none',
                                                    isActiveRoute(item.href) && 'bg-gray-100 text-neutral-900'
                                                )}
                                            >
                                                {item.label}
                                            </NavLink>
                                        )}
                                    </NavigationMenu.Item>
                                ))}
                            </NavigationMenu.List>

                            {/* Portal: 드롭다운 팝업이 렌더링되는 영역 */}
                            <NavigationMenu.Portal>
                                <NavigationMenu.Positioner
                                    className="nav-positioner"
                                    sideOffset={8}
                                    collisionPadding={{ top: 5, bottom: 5, left: 20, right: 20 }}
                                    collisionAvoidance={{ side: 'none' }}
                                >
                                    <NavigationMenu.Popup className="nav-popup">
                                        <NavigationMenu.Viewport />
                                    </NavigationMenu.Popup>
                                </NavigationMenu.Positioner>
                            </NavigationMenu.Portal>
                        </NavigationMenu.Root>

                        {/* 오른쪽: 사용자 영역 */}
                        <div className="relative" ref={userMenuRef} onMouseLeave={() => setIsUserMenuOpen(false)}>
                            <button
                                onClick={toggleUserMenu}
                                className="h-10 pl-3 pr-2.5 rounded-full flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2 outline-none"
                                aria-label="사용자 메뉴 열기"
                                aria-expanded={isUserMenuOpen}
                                aria-haspopup="menu"
                            >
                                <div className="size-7 rounded-full bg-[#4e8c6d]/10 flex items-center justify-center">
                                    {user ? (
                                        <UserCircle className="size-5 text-[#4e8c6d]" aria-hidden="true" />
                                    ) : (
                                        <User className="size-5 text-[#4e8c6d]" aria-hidden="true" />
                                    )}
                                </div>
                                {user && (
                                    <span className="text-sm font-medium text-gray-700 max-w-[80px] truncate" title={user.name}>{user.name}님</span>
                                )}
                                <ChevronDown className={cn(
                                    'size-4 text-gray-400 transition-transform duration-200',
                                    isUserMenuOpen && 'rotate-180'
                                )} aria-hidden="true" />
                            </button>

                            {/* 사용자 메뉴 팝오버 */}
                            {isUserMenuOpen && (
                                <div
                                    className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-[0_10px_40px_-8px_rgba(0,0,0,0.12),0_4px_12px_-4px_rgba(0,0,0,0.06)] z-50 min-w-[200px] p-1.5"
                                    onMouseEnter={() => setIsUserMenuOpen(true)}
                                    onMouseLeave={() => setIsUserMenuOpen(false)}
                                    role="menu"
                                    aria-label="사용자 메뉴"
                                >
                                    {/* 사용자 정보 */}
                                    {user && (
                                        <div className="px-3 py-2.5 mb-1 border-b border-gray-100">
                                            <p className="text-sm font-medium text-gray-900">{user.name}님</p>
                                            <p className="text-xs text-gray-500 mt-0.5">안녕하세요</p>
                                        </div>
                                    )}
                                    <Link
                                        href={`/${union.slug}/my-property`}
                                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors rounded-lg cursor-pointer focus-visible:bg-gray-50 focus-visible:outline-none"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        role="menuitem"
                                    >
                                        <MapPin className="size-4" aria-hidden="true" />
                                        내 공시지가 보기
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors rounded-lg cursor-pointer focus-visible:bg-gray-50 focus-visible:outline-none"
                                        role="menuitem"
                                    >
                                        <LogOut className="size-4" aria-hidden="true" />
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
