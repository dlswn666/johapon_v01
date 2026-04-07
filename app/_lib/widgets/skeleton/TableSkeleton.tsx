import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
    return (
        <div className="space-y-2">
            {/* 헤더 */}
            <div className="flex gap-4 p-3">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>

            {/* 구분선 */}
            <div className="h-px bg-gray-200" />

            {/* 행 */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={rowIdx} className="flex gap-4 p-3">
                    {Array.from({ length: columns }).map((_, colIdx) => (
                        <Skeleton
                            key={colIdx}
                            className="h-4 flex-1"
                            style={{ animationDelay: `${(rowIdx * columns + colIdx) * 75}ms` }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
