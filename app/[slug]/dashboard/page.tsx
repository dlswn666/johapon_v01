'use client';

import React from 'react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import UnionNavigation from '@/app/_lib/widgets/union/navigation/Navigation';
import UnionHeader from '@/app/_lib/widgets/union/header/UnionHeader';

export default function DashboardPage() {
    return (
        <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
            <div className="flex flex-col gap-6 mb-[80px]">
                <div className="flex justify-between items-center">
                    <UnionHeader />
                    <UnionNavigation />
                </div>
                <Separator className="bg-[#CCCCCC]" />
            </div>

            <div className="space-y-6">
                <h2 className="text-[32px] font-bold text-[#5FA37C]">알림톡 관리</h2>
                <div className="p-8 bg-[#E6E6E6] rounded-[12px] text-center text-[#4E8C6D]">
                    <p className="text-[16px]">알림톡 관리 기능 준비 중입니다.</p>
                </div>
            </div>
        </div>
    );
}

