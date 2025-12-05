'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, User, ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';

export default function UnionHomeHeader() {
    const { union } = useSlug();
    const { user, isSystemAdmin, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // 드롭다운 상태 관리
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // 외부 클릭 감지를 위한 ref
    const userMenuRef = useRef<HTMLDivElement>(null);
    const navigationRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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
            href: `/${union?.slug || ''}`,
            subItems: [
                { label: '공지사항', href: `/${union?.slug || ''}/notice` },
                { label: '질문 게시판', href: `/${union?.slug || ''}/qna` },
            ],
        },
        {
            id: 'communication',
            label: '소통방',
            href: `/${union?.slug || ''}/communication`,
            subItems: [
                { label: '조합 정보 공유', href: `/${union?.slug || ''}/communication/share` },
                { label: '자유 게시판', href: `/${union?.slug || ''}/communication/free` },
            ],
        },
        {
            id: 'admin',
            label: '관리자',
            href: `/${union?.slug || ''}/admin`,
            subItems: [],
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

    // 드롭다운 열기/닫기
    const handleMouseEnter = (menuId: string) => {
        setActiveDropdown(menuId);
    };

    const handleMouseLeave = () => {
        setActiveDropdown(null);
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

    if (!union) return null;

    return (
        <header className="bg-white border-b border-gray-200 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="h-[90px] relative">
                <div className="container mx-auto px-4 h-full flex items-center justify-between">
                    {/* 왼쪽: 로고 영역 */}
                    <div className="flex items-center gap-[13.5px]">
                        <div className="bg-[#4e8c6d] rounded-full size-[54px] flex items-center justify-center shrink-0">
                            {union.logo_url ? (
                                <img
                                    src={union.logo_url}
                                    alt={`${union.name} 로고`}
                                    className="size-[54px] rounded-full object-cover"
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

                    {/* 중앙: 네비게이션 */}
                    <nav className="flex items-center gap-[9px]">
                        {navigationItems.map((item) => (
                            <div
                                key={item.id}
                                ref={(el) => {
                                    navigationRefs.current[item.id] = el;
                                }}
                                className="relative"
                                onMouseEnter={() => item.subItems.length > 0 && handleMouseEnter(item.id)}
                                onMouseLeave={handleMouseLeave}
                            >
                                <Link
                                    href={item.href}
                                    className={`h-[54px] px-[27px] py-[13.5px] rounded-[13.5px] flex items-center text-[18px] leading-[27px] text-neutral-950 transition-colors ${
                                        pathname === item.href || pathname.startsWith(item.href + '/')
                                            ? 'bg-gray-100'
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    {item.label}
                                </Link>

                                {/* 2depth 드롭다운 메뉴 */}
                                {item.subItems.length > 0 && activeDropdown === item.id && (
                                    <div
                                        className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]"
                                        onMouseEnter={() => handleMouseEnter(item.id)}
                                        onMouseLeave={handleMouseLeave}
                                    >
                                        {item.subItems.map((subItem) => (
                                            <Link
                                                key={subItem.href}
                                                href={subItem.href}
                                                className={`block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                                    pathname === subItem.href ? 'bg-gray-50 font-medium' : ''
                                                }`}
                                                onClick={() => setActiveDropdown(null)}
                                            >
                                                {subItem.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* 오른쪽: 사용자 아이콘 영역 */}
                    <div className="relative" ref={userMenuRef} onMouseLeave={() => setIsUserMenuOpen(false)}>
                        <button
                            onClick={toggleUserMenu}
                            className="h-[45px] px-[18px] py-0 rounded-[13.5px] flex items-center gap-[9px] hover:bg-gray-50 transition-colors"
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
                                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-t-lg"
                                    onClick={() => setIsUserMenuOpen(false)}
                                >
                                    내정보
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-b-lg flex items-center gap-2"
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
    );
}
