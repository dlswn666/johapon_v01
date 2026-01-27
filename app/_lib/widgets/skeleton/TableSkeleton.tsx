interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
    return (
        <div className="space-y-3">
            {/* 헤더 */}
            <div className="flex gap-4 p-3 bg-slate-100 rounded-lg">
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={i} className="h-4 bg-slate-200 rounded flex-1 animate-pulse" />
                ))}
            </div>

            {/* 행 */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={rowIdx} className="flex gap-4 p-3 border border-slate-100 rounded-lg">
                    {Array.from({ length: columns }).map((_, colIdx) => (
                        <div
                            key={colIdx}
                            className="h-4 bg-slate-100 rounded flex-1 animate-pulse"
                            style={{ animationDelay: `${(rowIdx * columns + colIdx) * 50}ms` }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
