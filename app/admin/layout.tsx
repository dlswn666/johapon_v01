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
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="w-full h-[600px] rounded-[24px]" />
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
