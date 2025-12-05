'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import UnionInfoFooter from '@/app/_lib/widgets/union-info-footer/UnionInfoFooter';

interface UnionLayoutContentProps {
    children: React.ReactNode;
}

export default function UnionLayoutContent({ children }: UnionLayoutContentProps) {
    const { union, slug, isLoading: isUnionLoading } = useSlug();
    const { isLoading: isAuthLoading } = useAuth();
    const pathname = usePathname();

    // 로딩 중
    if (isUnionLoading || isAuthLoading) {
        return <div className="min-h-screen bg-gray-50">{children}</div>;
    }

    // 비활성화된 조합 접근 차단
    // union 객체에 is_active가 있는지 확인 (타입 확장 필요)
    const unionWithActive = union as (typeof union & { is_active?: boolean }) | null;

    if (unionWithActive && unionWithActive.is_active === false) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-gray-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-3">조합 홈페이지가 비활성화 되었습니다</h1>
                    <p className="text-gray-500 mb-6">
                        해당 조합의 홈페이지가 현재 비활성화 상태입니다.
                        <br />
                        자세한 내용은 조합에 문의해주세요.
                    </p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
                    >
                        홈으로 돌아가기
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="flex-1">{children}</div>
            {/* 대시보드가 아닐 때만 Footer 표시 */}
            {union && <UnionInfoFooter union={union} />}
        </div>
    );
}
