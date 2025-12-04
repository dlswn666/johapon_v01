'use client';

import React from 'react';
import { Building2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface UnionDashboardProps {
    totalCount: number;
    activeCount: number;
    inactiveCount: number;
    isLoading?: boolean;
}

export default function UnionDashboard({
    totalCount,
    activeCount,
    inactiveCount,
    isLoading = false,
}: UnionDashboardProps) {
    const stats = [
        {
            title: '총 조합 수',
            value: totalCount,
            icon: Building2,
            bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
            iconBg: 'bg-white/20',
        },
        {
            title: '활성 조합',
            value: activeCount,
            icon: CheckCircle2,
            bgColor: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            iconBg: 'bg-white/20',
        },
        {
            title: '비활성 조합',
            value: inactiveCount,
            icon: XCircle,
            bgColor: 'bg-gradient-to-br from-slate-500 to-slate-600',
            iconBg: 'bg-white/20',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <Card key={index} className={`${stat.bgColor} border-0 shadow-lg overflow-hidden`}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-white/80">{stat.title}</p>
                                    {isLoading ? (
                                        <div className="h-9 w-16 bg-white/20 rounded animate-pulse" />
                                    ) : (
                                        <p className="text-3xl font-bold text-white">{stat.value.toLocaleString()}</p>
                                    )}
                                </div>
                                <div className={`${stat.iconBg} p-3 rounded-xl`}>
                                    <Icon className="w-8 h-8 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
