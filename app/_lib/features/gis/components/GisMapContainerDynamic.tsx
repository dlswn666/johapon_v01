'use client';

import dynamic from 'next/dynamic';
import { Loader2, MapPin } from 'lucide-react';

// GIS Map loading skeleton
function GisMapSkeleton() {
    return (
        <div className="w-full h-[600px] bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <MapPin className="h-16 w-16 text-gray-300" />
                <Loader2 className="h-8 w-8 absolute -bottom-2 -right-2 animate-spin text-primary" />
            </div>
            <div className="text-center">
                <p className="text-gray-500 font-medium">GIS 지도 로딩 중...</p>
                <p className="text-gray-400 text-sm">ECharts 라이브러리를 불러오고 있습니다</p>
            </div>
            {/* Fake loading progress */}
            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary/50 animate-pulse rounded-full" style={{ width: '60%' }} />
            </div>
        </div>
    );
}

// Dynamic import with SSR disabled (ECharts requires DOM)
export const GisMapContainerDynamic = dynamic(
    () => import('./GisMapContainer'),
    {
        ssr: false,
        loading: () => <GisMapSkeleton />,
    }
);

export default GisMapContainerDynamic;
