'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Shield, Building2, Users, LogOut, Home } from 'lucide-react';
import AuthProvider, { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { Button } from '@/components/ui/button';

function SystemAdminHeader() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const router = useRouter();

    const navItems = [
        { href: '/systemAdmin', label: '대시보드', icon: Home, exact: true },
        { href: '/systemAdmin/unions', label: '조합 관리', icon: Building2 },
    ];

    const handleLogout = async () => {
        await logout();
        router.push('/systemAdmin/login');
    };

    return (
        <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700 shadow-lg">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* 로고 & 네비게이션 */}
                    <div className="flex items-center gap-8">
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

                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.exact
                                    ? pathname === item.href
                                    : pathname.startsWith(item.href) && pathname !== '/systemAdmin';
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                                            isActive
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* 사용자 정보 */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
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
            </div>
        </header>
    );
}

function SystemAdminLayoutContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isLoading, isSystemAdmin, isAuthenticated } = useAuth();

    // 로그인 페이지는 레이아웃 체크 제외
    const isLoginPage = pathname === '/systemAdmin/login';

    useEffect(() => {
        if (!isLoading && !isLoginPage) {
            if (!isAuthenticated) {
                router.push('/systemAdmin/login');
            } else if (!isSystemAdmin) {
                router.push('/systemAdmin/login');
            }
        }
    }, [isLoading, isAuthenticated, isSystemAdmin, isLoginPage, router]);

    // 로그인 페이지는 레이아웃 없이 렌더링
    if (isLoginPage) {
        return <>{children}</>;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                    <p className="text-lg text-slate-400">로딩 중...</p>
                </div>
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
                    <Button
                        onClick={() => router.push('/systemAdmin/login')}
                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                    >
                        로그인 페이지로 이동
                    </Button>
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

