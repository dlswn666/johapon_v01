'use client';

import React from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import AuthProvider, { useAuth } from '@/app/_lib/app/providers/AuthProvider';

function MarketingHeader() {
    const { isSystemAdmin, isLoading } = useAuth();

    return (
        <header className="border-b border-[#CCCCCC] bg-white sticky top-0 z-50">
            <div className="container mx-auto max-w-[1280px] px-4 h-[56px] flex items-center justify-between">
                <Link
                    href="/"
                    className="font-bold text-[#5FA37C] cursor-pointer"
                    style={{ fontSize: 'var(--text-marketing-footer-title)' }}
                >
                    조합온
                </Link>
                {/* 데스크톱 네비게이션 */}
                <nav className="hidden md:flex items-center gap-8">
                    {!isLoading && isSystemAdmin && (
                        <Link
                            href="/admin/unions"
                            className="flex items-center gap-1.5 text-[14px] font-medium text-[#4E8C6D] hover:text-[#4E8C6D]/80 px-4 py-2 bg-[#F5F5F5] hover:bg-[#E6E6E6] rounded-lg transition-colors cursor-pointer"
                        >
                            <Settings className="w-4 h-4" />
                            조합 관리
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
}

import MarketingFooter from '@/app/_lib/widgets/marketing/footer/MarketingFooter';

function MarketingLayoutContent({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen">
            <MarketingHeader />
            <main className="flex-1">{children}</main>
            <MarketingFooter />
        </div>
    );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <MarketingLayoutContent>{children}</MarketingLayoutContent>
        </AuthProvider>
    );
}
