import { Skeleton } from '@/components/ui/skeleton';

interface CardSkeletonProps {
    count?: number;
}

export function CardSkeleton({ count = 3 }: CardSkeletonProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="p-5 rounded-xl bg-white shadow-sm space-y-3"
                >
                    <Skeleton className="h-5 w-2/3" style={{ animationDelay: `${i * 150}ms` }} />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" style={{ animationDelay: `${i * 150 + 50}ms` }} />
                        <Skeleton className="h-4 w-4/5" style={{ animationDelay: `${i * 150 + 100}ms` }} />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Skeleton className="h-8 flex-1 rounded-md" />
                        <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                </div>
            ))}
        </div>
    );
}
