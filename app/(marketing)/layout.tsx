'use client';

import React from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import AuthProvider, { useAuth } from '@/app/_lib/app/providers/AuthProvider';

function MarketingHeader() {
    const { isSystemAdmin, isLoading } = useAuth();

    return (
        <header className="border-b bg-white px-6">
            <div className="max-w-6xl mx-auto h-16 flex items-center justify-between">
                <div className="font-bold text-xl">조합온</div>
                <nav className="hidden md:flex items-center gap-6">
                    <Link href="/features" className="text-sm font-medium hover:text-blue-600">
                        기능 소개
                    </Link>
                    <Link href="/pricing" className="text-sm font-medium hover:text-blue-600">
                        요금 안내
                    </Link>
                    <Link href="/contact" className="text-sm font-medium hover:text-blue-600">
                        문의하기
                    </Link>
                    {!isLoading && isSystemAdmin && (
                        <Link
                            href="/admin/unions"
                            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-lg"
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

function MarketingFooter() {
    return (
        <footer className="bg-[#2d2d2d] text-white pt-12 pb-8 px-6">
            <div className="max-w-6xl mx-auto w-full">
                {/* Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-8">
                    {/* Column 1 - Service Info */}
                    <div>
                        <h3 className="text-xl font-normal mb-4">조합 홈페이지 서비스</h3>
                        <p className="text-white/70 text-base leading-relaxed">
                            재개발/재건축 조합을 위한
                            <br />
                            스마트한 소통 플랫폼
                        </p>
                    </div>

                    {/* Column 2 - Quick Links */}
                    <div>
                        <h4 className="text-base font-normal mb-4">바로가기</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    href="/features"
                                    className="text-white/70 hover:text-white transition-colors text-base"
                                >
                                    서비스 소개
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/features"
                                    className="text-white/70 hover:text-white transition-colors text-base"
                                >
                                    기능 안내
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/pricing"
                                    className="text-white/70 hover:text-white transition-colors text-base"
                                >
                                    요금 안내
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/contact"
                                    className="text-white/70 hover:text-white transition-colors text-base"
                                >
                                    고객 지원
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3 - Contact */}
                    <div>
                        <h4 className="text-base font-normal mb-4">문의하기</h4>
                        <ul className="space-y-2 text-white/70 text-base">
                            <li>전화: 1588-XXXX</li>
                            <li>이메일: contact@example.com</li>
                            <li>운영시간: 평일 09:00 - 18:00</li>
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-white/10 pt-8">
                    <p className="text-center text-white/60 text-base">
                        © 2024 조합 홈페이지 서비스. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

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
