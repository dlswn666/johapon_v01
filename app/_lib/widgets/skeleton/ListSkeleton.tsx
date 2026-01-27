interface ListSkeletonProps {
    items?: number;
    showAvatar?: boolean;
}

export function ListSkeleton({ items = 5, showAvatar = false }: ListSkeletonProps) {
    return (
        <div className="space-y-2">
            {Array.from({ length: items }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                >
                    {showAvatar && (
                        <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
                    )}
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}
