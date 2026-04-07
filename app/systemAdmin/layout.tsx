'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, Building2, Users, LogOut, Home, MessageSquare, ChevronDown, MapPin, ClipboardList, Send, FileText, KeyRound } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AuthProvider, { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    exact?: boolean;
    subItems?: { href: string; label: string }[];
}

function SystemAdminHeader() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const router = useRouter();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isCompactMenuOpen, setIsCompactMenuOpen] = useState(false);

    const navItems: NavItem[] = [
        { href: '/systemAdmin', label: '대시보드', icon: Home, exact: true },
        { href: '/systemAdmin/unions', label: '조합 관리', icon: Building2 },
        { href: '/systemAdmin/stages', label: '단계 마스터', icon: Shield },
        {
            href: '/systemAdmin/gis',
            label: '조합 데이터 관리',
            icon: MapPin,
            subItems: [
                { href: '/systemAdmin/gis', label: 'GIS 데이터 관리' },
                { href: '/systemAdmin/gis/members', label: '조합원 관리' },
            ],
        },
        {
            href: '/systemAdmin/alimtalk',
            label: '알림톡',
            icon: MessageSquare,
            subItems: [
                { href: '/systemAdmin/alimtalk', label: '알림톡 관리' },
                { href: '/systemAdmin/alimtalk/templates', label: '템플릿 관리' },
                { href: '/systemAdmin/alimtalk/pricing', label: '가격 관리' },
            ],
        },
        { href: '/systemAdmin/consent-versions', label: '약관 관리', icon: FileText },
        { href: '/systemAdmin/sms', label: 'SMS 발송', icon: Send },
        { href: '/systemAdmin/access-logs', label: '접속 로그', icon: ClipboardList },
        { href: '/systemAdmin/access-tokens', label: '접근 토큰', icon: KeyRound },
    ];

    const handleLogout = async () => {
        await logout();
        router.push('/systemAdmin/login');
    };

    const isActiveRoute = (href: string, exact?: boolean) => {
        if (exact) {
            return pathname === href;
        }
        return pathname.startsWith(href) && pathname !== '/systemAdmin';
    };

    const hasActiveSubItem = (subItems?: { href: string; label: string }[]) => {
        if (!subItems) return false;
        return subItems.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
    };

    const handleDropdownToggle = (href: string) => {
        setOpenDropdown(openDropdown === href ? null : href);
    };

    // 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = () => {
            setOpenDropdown(null);
            setIsCompactMenuOpen(false);
        };

        if (openDropdown || isCompactMenuOpen) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [openDropdown, isCompactMenuOpen]);

    return (
        <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700 shadow-lg">
            <div className="container mx-auto px-4 relative">
                <div className="flex items-center justify-between h-16">
                    {/* 로고 & 네비게이션 */}
                    <div className="flex items-center gap-4 lg:gap-8 min-w-0">
                        <Link href="/systemAdmin" className="flex items-center gap-3 cursor-pointer">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="font-bold text-lg text-white">조합온</span>
                                <span className="ml-2 text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded font-medium border border-blue-500/30">
                                    System Admin
                                </span>
                            </div>
                        </Link>

                        <nav className="hidden lg:flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const hasSubItems = item.subItems && item.subItems.length > 0;
                                const isActive = hasSubItems
                                    ? hasActiveSubItem(item.subItems)
                                    : isActiveRoute(item.href, item.exact);

                                if (hasSubItems) {
                                    return (
                                        <div key={item.href} className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDropdownToggle(item.href);
                                                }}
                                                className={cn(
                                                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
                                                    isActive
                                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                )}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {item.label}
                                                <ChevronDown
                                                    className={cn(
                                                        'w-3 h-3 transition-transform duration-200',
                                                        openDropdown === item.href && 'rotate-180'
                                                    )}
                                                />
                                            </button>

                                            {/* 드롭다운 메뉴 */}
                                            {openDropdown === item.href && (
                                                <div
                                                    className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {item.subItems?.map((subItem) => (
                                                        <Link
                                                            key={subItem.href}
                                                            href={subItem.href}
                                                            onClick={() => setOpenDropdown(null)}
                                                            className={cn(
                                                                'block px-4 py-2 text-sm transition-colors',
                                                                pathname === subItem.href
                                                                    ? 'bg-blue-500/20 text-blue-400'
                                                                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                                            )}
                                                        >
                                                            {subItem.label}
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
                                            isActive
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* 태블릿/모바일 컴팩트 메뉴 */}
                        <div className="relative lg:hidden">
                            <Button
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCompactMenuOpen((prev) => !prev);
                                }}
                                className="text-slate-300 hover:text-white hover:bg-slate-800 h-9 px-3"
                            >
                                메뉴
                                <ChevronDown
                                    className={cn(
                                        'w-4 h-4 transition-transform duration-200',
                                        isCompactMenuOpen && 'rotate-180'
                                    )}
                                />
                            </Button>
                        </div>
                    </div>

                    {/* 사용자 정보 */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden xl:block">
                                <p className="text-sm font-medium text-white">{user?.name}</p>
                                <p className="text-xs text-slate-400">시스템 관리자</p>
                            </div>
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            className="text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {isCompactMenuOpen && (
                    <div
                        className="lg:hidden absolute top-full left-4 right-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 z-50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="max-h-[65vh] overflow-y-auto">
                            {navItems.map((item) => {
                                const isActive = isActiveRoute(item.href, item.exact);
                                return (
                                    <div key={item.href} className="mb-1 last:mb-0">
                                        <Link
                                            href={item.href}
                                            onClick={() => setIsCompactMenuOpen(false)}
                                            className={cn(
                                                'block px-3 py-2 rounded-md text-sm font-medium',
                                                isActive
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'text-slate-200 hover:bg-slate-700'
                                            )}
                                        >
                                            {item.label}
                                        </Link>

                                        {item.subItems && item.subItems.length > 0 && (
                                            <div className="mt-1 ml-2 pl-2 border-l border-slate-700 space-y-1">
                                                {item.subItems.map((subItem) => (
                                                    <Link
                                                        key={subItem.href}
                                                        href={subItem.href}
                                                        onClick={() => setIsCompactMenuOpen(false)}
                                                        className={cn(
                                                            'block px-3 py-1.5 rounded-md text-xs',
                                                            pathname === subItem.href
                                                                ? 'bg-blue-500/20 text-blue-300'
                                                                : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                                        )}
                                                    >
                                                        {subItem.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}

function SystemAdminLayoutContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isLoading, isUserFetching, isSystemAdmin, user } = useAuth();

    // 테스트 모드 상태 (인증 우회)
    const [isTestMode, setIsTestMode] = useState(false);

    // 로그인 페이지는 레이아웃 체크 제외
    const isLoginPage = pathname === '/systemAdmin/login';

    // 전체 로딩 상태
    // - isLoading: 최초 세션 확인 중 (필수 대기)
    // - isUserFetching: 사용자 프로필 조회 중
    // 
    // 개선: 이미 user 정보가 있고 isUserFetching인 경우는 백그라운드 갱신이므로
    // 전체 화면 로딩을 띄우지 않고 기존 UI를 유지합니다.
    const isFullLoading = isLoading || (!user && isUserFetching);

    // 테스트 모드나 인증 실패 시 리다이렉트하지 않고 "접근 권한 없음" 화면 표시
    // (테스트 모드 진입 버튼을 사용할 수 있도록)

    // 로그인 페이지는 레이아웃 없이 렌더링 (로딩 상태와 관계없이)
    if (isLoginPage) {
        return <>{children}</>;
    }

    // 테스트 모드에서는 로딩/인증 체크 우회
    if (isTestMode) {
        return (
            <div className="min-h-screen bg-slate-900">
                <div className="bg-orange-500/20 border-b border-orange-500/30 px-4 py-2 text-center flex items-center justify-center gap-4">
                    <span className="text-orange-400 text-sm font-medium">🧪 테스트 모드: 인증 우회 중</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsTestMode(false)}
                        className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 h-6 px-2 text-xs"
                    >
                        테스트 모드 종료
                    </Button>
                </div>
                <SystemAdminHeader />
                <main className="container mx-auto px-4 py-8">{children}</main>
            </div>
        );
    }

    // 초기 로딩 또는 user 정보 fetch 중
    if (isFullLoading) {
        return (
            <div className="min-h-screen bg-slate-900">
                {/* 헤더 바 */}
                <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700 shadow-lg">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-4">
                                <Skeleton className="w-10 h-10 rounded-xl bg-slate-700" />
                                <Skeleton className="h-6 w-24 bg-slate-700" style={{ animationDelay: '50ms' }} />
                                {/* 네비게이션 아이템 */}
                                <div className="hidden lg:flex items-center gap-2 ml-4">
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <Skeleton key={i} className="h-9 w-20 rounded-lg bg-slate-700" style={{ animationDelay: `${80 + i * 40}ms` }} />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-4 w-20 bg-slate-700 hidden xl:block" style={{ animationDelay: '300ms' }} />
                                <Skeleton className="w-9 h-9 rounded-full bg-slate-700" style={{ animationDelay: '330ms' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 콘텐츠 영역 */}
                <main className="container mx-auto px-4 py-8">
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-40 bg-slate-700" style={{ animationDelay: '380ms' }} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[0, 1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-28 rounded-lg bg-slate-700" style={{ animationDelay: `${420 + i * 50}ms` }} />
                            ))}
                        </div>
                        <Skeleton className="h-64 rounded-lg bg-slate-700" style={{ animationDelay: '650ms' }} />
                    </div>
                </main>
            </div>
        );
    }

    if (!isSystemAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center space-y-4">
                    <Shield className="w-16 h-16 text-slate-600 mx-auto" />
                    <p className="text-xl font-semibold text-white">접근 권한이 없습니다</p>
                    <p className="text-slate-400">시스템 관리자만 접근할 수 있습니다</p>
                    <div className="flex flex-col gap-2 mt-4">
                        <Button
                            onClick={() => router.push('/systemAdmin/login')}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            로그인 페이지로 이동
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsTestMode(true)}
                            className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
                        >
                            🧪 테스트 모드로 진입
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <SystemAdminHeader />
            <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
    );
}

export default function SystemAdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <SystemAdminLayoutContent>{children}</SystemAdminLayoutContent>
        </AuthProvider>
    );
}
