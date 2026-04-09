'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
    return (
        <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
            <div className="space-y-6">
                <h2 className="text-[32px] font-bold text-brand-light">알림톡 관리</h2>
                <div className="p-8 bg-subtle-bg rounded-[12px] text-center text-brand">
                    <p className="text-[16px]">알림톡 관리 기능 준비 중입니다.</p>
                </div>
            </div>
        </div>
    );
}

