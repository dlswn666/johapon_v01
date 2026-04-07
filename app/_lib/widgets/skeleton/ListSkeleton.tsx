import { Skeleton } from '@/components/ui/skeleton';

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
                    className="flex items-center gap-3 p-3 rounded-lg"
                >
                    {showAvatar && (
                        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    )}
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" style={{ animationDelay: `${i * 100}ms` }} />
                        <Skeleton className="h-3 w-1/2" style={{ animationDelay: `${i * 100 + 50}ms` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}
