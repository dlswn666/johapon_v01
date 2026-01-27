interface CardSkeletonProps {
    count?: number;
}

export function CardSkeleton({ count = 3 }: CardSkeletonProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="p-4 border border-slate-200 rounded-xl animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                >
                    <div className="h-6 bg-slate-200 rounded w-2/3 mb-3" />
                    <div className="space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-full" />
                        <div className="h-4 bg-slate-100 rounded w-4/5" />
                        <div className="h-4 bg-slate-100 rounded w-3/5" />
                    </div>
                    <div className="mt-4 flex gap-2">
                        <div className="h-8 bg-slate-100 rounded flex-1" />
                        <div className="h-8 bg-slate-100 rounded w-20" />
                    </div>
                </div>
            ))}
        </div>
    );
}
