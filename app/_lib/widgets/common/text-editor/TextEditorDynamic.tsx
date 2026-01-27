'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Loading skeleton component
function TextEditorSkeleton() {
    return (
        <div className="border border-input rounded-md bg-white shadow-sm w-full overflow-hidden">
            {/* Toolbar skeleton */}
            <div className="flex items-center gap-1 p-2 border-b border-input bg-gray-50">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-px mx-1" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
            </div>
            {/* Content area skeleton */}
            <div className="p-4 min-h-[200px] space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
            </div>
        </div>
    );
}

// Dynamic import with SSR disabled (TipTap requires browser APIs)
export const TextEditorDynamic = dynamic(
    () => import('./ui/TextEditor').then((mod) => mod.TextEditor),
    {
        ssr: false,
        loading: () => <TextEditorSkeleton />,
    }
);
