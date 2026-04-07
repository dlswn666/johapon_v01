import { Skeleton } from '@/components/ui/skeleton';

interface FormSkeletonProps {
    fields?: number;
    hasEditor?: boolean;
    hasButtons?: boolean;
}

export function FormSkeleton({ fields = 4, hasEditor = false, hasButtons = true }: FormSkeletonProps) {
    return (
        <div className="space-y-5">
            {/* 입력 필드들 */}
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" style={{ animationDelay: `${i * 100}ms` }} />
                    <Skeleton className="h-10 w-full" style={{ animationDelay: `${i * 100 + 50}ms` }} />
                </div>
            ))}

            {/* 텍스트 에디터 영역 */}
            {hasEditor && (
                <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                </div>
            )}

            {/* 버튼 영역 */}
            {hasButtons && (
                <div className="flex justify-end gap-3 pt-4">
                    <Skeleton className="h-10 w-20 rounded-md" />
                    <Skeleton className="h-10 w-24 rounded-md" />
                </div>
            )}
        </div>
    );
}
