'use client';

import React from 'react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import UnionNavigation from '@/app/_lib/widgets/union/navigation/Navigation';
import UnionHeader from '@/app/_lib/widgets/union/header/UnionHeader';

export default function DashboardPage() {
    return (
        <div className={cn('container mx-auto p-6')}>
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex justify-between items-center">
                    <UnionHeader />
                    <UnionNavigation />
                </div>
                <Separator />
            </div>

            <div className="space-y-6">
                <h1 className="text-3xl font-bold">알림톡 관리</h1>
                <div className="p-12 border-2 border-dashed rounded-lg text-center text-gray-400">
                    <p>알림톡 관리 기능 준비 중입니다.</p>
                </div>
            </div>
        </div>
    );
}

