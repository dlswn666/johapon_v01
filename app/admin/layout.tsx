'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import AuthProvider, { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { AdminHeader } from '@/app/_lib/widgets/admin-header';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { isLoading, isSystemAdmin } = useAuth();

    useEffect(() => {
        if (!isLoading && !isSystemAdmin) {
            // 권한이 없으면 홈으로 리다이렉트
            router.push('/');
        }
    }, [isLoading, isSystemAdmin, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                {/* 헤더 바 */}
                <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-4">
                                <Skeleton className="w-10 h-10 rounded-xl" />
                                <Skeleton className="h-6 w-20" style={{ animationDelay: '50ms' }} />
                                <div className="hidden md:flex items-center gap-2 ml-4">
                                    {[0, 1, 2].map((i) => (
                                        <Skeleton key={i} className="h-9 w-20 rounded-lg" style={{ animationDelay: `${80 + i * 40}ms` }} />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-9 h-9 rounded-full" style={{ animationDelay: '220ms' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 콘텐츠 영역 */}
                <main className="container mx-auto px-4 py-8">
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-36" style={{ animationDelay: '280ms' }} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[0, 1, 2].map((i) => (
                                <Skeleton key={i} className="h-28 rounded-lg" style={{ animationDelay: `${320 + i * 50}ms` }} />
                            ))}
                        </div>
                        <Skeleton className="h-48 rounded-lg" style={{ animationDelay: '500ms' }} />
                    </div>
                </main>
            </div>
        );
    }

    if (!isSystemAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-4">
                    <p className="text-xl font-semibold text-gray-700">접근 권한이 없습니다</p>
                    <p className="text-gray-500">시스템 관리자만 접근할 수 있습니다</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminHeader />
            <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AuthProvider>
    );
}
