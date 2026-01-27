interface FormSkeletonProps {
    fields?: number;
}

export function FormSkeleton({ fields = 4 }: FormSkeletonProps) {
    return (
        <div className="space-y-4">
            {Array.from({ length: fields }).map((_, i) => (
                <div
                    key={i}
                    className="space-y-2 animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                >
                    <div className="h-4 bg-slate-200 rounded w-24" />
                    <div className="h-10 bg-slate-100 rounded w-full" />
                </div>
            ))}
            <div className="flex justify-end gap-2 pt-4">
                <div className="h-10 bg-slate-100 rounded w-20" />
                <div className="h-10 bg-slate-200 rounded w-24" />
            </div>
        </div>
    );
}
