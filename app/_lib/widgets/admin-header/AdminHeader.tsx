'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Home, Users } from 'lucide-react';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { Button } from '@/components/ui/button';

export default function AdminHeader() {
    const pathname = usePathname();
    const { user } = useAuth();

    const navItems = [{ href: '/admin/unions', label: '조합 관리', icon: Building2 }];

    return (
        <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* 로고 & 네비게이션 */}
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-xl">조합온</span>
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                                Admin
                            </span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* 사용자 정보 & 개발 도구 */}
                    <div className="flex items-center gap-4">

                        {/* 현재 사용자 */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium">{user?.name}</p>
                                <p className="text-xs text-gray-500">{user?.role}</p>
                            </div>
                            <div className="w-9 h-9 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                        </div>

                        {/* 홈으로 */}
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="text-gray-500">
                                <Home className="w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
