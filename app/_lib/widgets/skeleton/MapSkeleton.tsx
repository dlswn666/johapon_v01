import { Skeleton } from '@/components/ui/skeleton';

interface MapSkeletonProps {
    className?: string;
}

export function MapSkeleton({ className = '' }: MapSkeletonProps) {
    return (
        <div className={`flex-1 min-h-[400px] relative rounded-xl overflow-hidden ${className}`}>
            <Skeleton className="absolute inset-0 rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-sm text-gray-400">지도 로딩 중...</div>
            </div>
        </div>
    );
}
