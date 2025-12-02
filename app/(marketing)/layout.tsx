import React from 'react';
import Link from 'next/link';

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="border-b bg-white">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="font-bold text-xl">조합온</div>
                    <nav className="hidden md:flex gap-6">
                        <Link href="/features" className="text-sm font-medium hover:text-blue-600">기능 소개</Link>
                        <Link href="/pricing" className="text-sm font-medium hover:text-blue-600">요금 안내</Link>
                        <Link href="/contact" className="text-sm font-medium hover:text-blue-600">문의하기</Link>
                    </nav>
                </div>
            </header>
            <main className="flex-1">
                {children}
            </main>
            <footer className="bg-gray-50 border-t py-12">
                <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
                    © 2024 조합온. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

