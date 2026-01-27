'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, LogOut, UserCircle, Home, MapPin } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface UnionMobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NavigationItem {
    id: string;
    label: string;
    href: string;
    subItems: { label: string; href: string }[];
}

export default function UnionMobileSidebar({ isOpen, onClose }: UnionMobileSidebarProps) {
    const { union } = useSlug();
    const { user, isAdmin, isSystemAdmin, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // 열려있는 메뉴 상태 관리
    const [openMenus, setOpenMenus] = useState<string[]>([]);
    // 사용자 메뉴 확장 상태
    const [isUserMenuExpanded, setIsUserMenuExpanded] = useState(false);

    // 네비게이션 메뉴 구조
    const navigationItems: NavigationItem[] = [
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

    // 메뉴 토글
    const toggleMenu = (menuId: string) => {
        setOpenMenus((prev) => (prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]));
    };

    // 로그아웃 처리
    const handleLogout = () => {
        logout();
        onClose();
        router.push('/');
    };

    // 링크 클릭 시 사이드바 닫기
    const handleLinkClick = () => {
        onClose();
    };

    if (!union) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="left" className="w-[280px] p-0 bg-white flex flex-col [&>button]:hidden" id="mobile-sidebar">
                <SheetHeader className="sr-only">
                    <SheetTitle>네비게이션 메뉴</SheetTitle>
                    <SheetDescription>조합 네비게이션 메뉴입니다.</SheetDescription>
                </SheetHeader>

                {/* 사이드바 헤더 - 조합 정보 */}
                <div className="p-4 border-b border-gray-200">
                    <Link
                        href={`/${union.slug}`}
                        onClick={handleLinkClick}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity rounded-lg focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2 outline-none"
                        aria-label={`${union.name} 홈으로 이동`}
                    >
                        <div className="bg-[#4e8c6d] rounded-full size-[44px] flex items-center justify-center shrink-0 relative overflow-hidden">
                            {union.logo_url ? (
                                <Image
                                    src={union.logo_url}
                                    alt={`${union.name} 로고`}
                                    fill
                                    className="rounded-full object-cover"
                                />
                            ) : (
                                <Home className="size-[22px] text-white" aria-hidden="true" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-[15px] leading-[21px] font-bold text-[#4e8c6d] truncate">{union.name}</p>
                        </div>
                    </Link>
                </div>

                {/* 네비게이션 메뉴 */}
                <nav className="flex-1 overflow-y-auto py-2" aria-label="메인 네비게이션">
                    {navigationItems.map((item) => (
                        <div key={item.id} className="px-2">
                            {item.subItems.length > 0 ? (
                                <Collapsible
                                    open={openMenus.includes(item.id)}
                                    onOpenChange={() => toggleMenu(item.id)}
                                >
                                    <CollapsibleTrigger asChild>
                                        <button
                                            className={cn(
                                                'w-full flex items-center justify-between px-3 py-3 rounded-lg text-[15px] font-medium transition-colors cursor-pointer',
                                                'outline-none focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-inset',
                                                isActiveRoute(item.href)
                                                    ? 'bg-[#4e8c6d]/10 text-[#4e8c6d]'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                            )}
                                            aria-expanded={openMenus.includes(item.id)}
                                        >
                                            <span>{item.label}</span>
                                            <ChevronDown
                                                className={cn(
                                                    'size-4 transition-transform duration-200',
                                                    openMenus.includes(item.id) && 'rotate-180'
                                                )}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pl-4 pb-1">
                                        {item.subItems.map((subItem) => (
                                            <Link
                                                key={subItem.href}
                                                href={subItem.href}
                                                onClick={handleLinkClick}
                                                className={cn(
                                                    'block px-3 py-2.5 rounded-lg text-[14px] transition-colors cursor-pointer',
                                                    'outline-none focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-inset',
                                                    pathname === subItem.href
                                                        ? 'bg-[#4e8c6d]/10 text-[#4e8c6d] font-medium'
                                                        : 'text-gray-600 hover:bg-gray-100'
                                                )}
                                            >
                                                {subItem.label}
                                            </Link>
                                        ))}
                                    </CollapsibleContent>
                                </Collapsible>
                            ) : (
                                <Link
                                    href={item.href}
                                    onClick={handleLinkClick}
                                    className={cn(
                                        'block px-3 py-3 rounded-lg text-[15px] font-medium transition-colors cursor-pointer',
                                        'outline-none focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-inset',
                                        isActiveRoute(item.href)
                                            ? 'bg-[#4e8c6d]/10 text-[#4e8c6d]'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    )}
                                >
                                    {item.label}
                                </Link>
                            )}
                        </div>
                    ))}
                </nav>

                {/* 하단 사용자 메뉴 영역 */}
                <div className="border-t border-gray-200 p-2">
                    {/* 사용자 인사 문구 */}
                    {user && (
                        <div className="px-3 py-2 mb-1">
                            <div className="flex items-center gap-3">
                                <div className="size-[36px] flex items-center justify-center bg-[#4e8c6d]/10 rounded-full">
                                    <UserCircle className="size-[24px] text-[#4e8c6d]" aria-hidden="true" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[14px] font-medium text-gray-800 max-w-[120px] truncate" title={user.name}>{user.name}님</span>
                                    <span className="text-[12px] text-gray-500">안녕하세요</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <button
                            onClick={() => setIsUserMenuExpanded(!isUserMenuExpanded)}
                            className={cn(
                                'w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors cursor-pointer',
                                'outline-none focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-inset',
                                isUserMenuExpanded ? 'bg-[#4e8c6d]/10' : 'hover:bg-gray-100'
                            )}
                            aria-label="내 계정 메뉴 열기"
                            aria-expanded={isUserMenuExpanded}
                            aria-haspopup="menu"
                        >
                            <div className="flex items-center gap-3">
                                <div className="size-[36px] flex items-center justify-center bg-[#4e8c6d]/10 rounded-full">
                                    <UserCircle className="size-[24px] text-[#4e8c6d]" aria-hidden="true" />
                                </div>
                                <span className="text-[14px] font-medium text-gray-700">
                                    {user ? '내 계정' : '로그인'}
                                </span>
                            </div>
                            <ChevronRight
                                className={cn(
                                    'size-4 text-gray-400 transition-transform duration-200',
                                    isUserMenuExpanded && 'rotate-90'
                                )}
                                aria-hidden="true"
                            />
                        </button>

                        {/* 사용자 서브메뉴 - 오른쪽으로 확장 */}
                        {isUserMenuExpanded && (
                            <div
                                className="absolute left-full top-0 ml-2 w-[180px] bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                                role="menu"
                                aria-label="내 계정 메뉴"
                            >
                                <Link
                                    href={`/${union.slug}/my-property`}
                                    onClick={handleLinkClick}
                                    className="px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors rounded-t-lg cursor-pointer flex items-center gap-2 focus-visible:bg-gray-100 focus-visible:outline-none"
                                    role="menuitem"
                                >
                                    <MapPin className="size-4" aria-hidden="true" />내 공시지가 보기
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors rounded-b-lg flex items-center gap-2 cursor-pointer focus-visible:bg-gray-100 focus-visible:outline-none"
                                    role="menuitem"
                                >
                                    <LogOut className="size-4" aria-hidden="true" />
                                    로그아웃
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
