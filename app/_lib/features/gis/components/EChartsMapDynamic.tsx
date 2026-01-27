'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

interface EChartsMapSkeletonProps {
    height?: number;
}

function EChartsMapSkeleton({ height = 400 }: EChartsMapSkeletonProps) {
    return (
        <div
            className="w-full bg-slate-50 rounded-lg flex items-center justify-center"
            style={{ height: `${height}px` }}
        >
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-slate-500">지도 로딩 중...</span>
            </div>
        </div>
    );
}

// Dynamic import
export const EChartsMapDynamic = dynamic(
    () => import('@/components/map/EChartsMap'),
    {
        ssr: false,
        loading: () => <EChartsMapSkeleton />,
    }
);

// Re-export types
export type { ParcelData, MapViewMode } from '@/components/map/EChartsMap';
