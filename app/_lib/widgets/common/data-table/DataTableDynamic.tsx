'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

interface DataTableSkeletonProps {
    columns?: number;
    rows?: number;
}

function DataTableSkeleton({ columns = 5, rows = 10 }: DataTableSkeletonProps) {
    return (
        <div className="w-full border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex bg-gray-50 border-b">
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={i} className="flex-1 px-4 py-3">
                        <Skeleton className="h-4 w-20" />
                    </div>
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex border-b last:border-0">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div key={colIndex} className="flex-1 px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// Dynamic import
export const DataTableDynamic = dynamic(
    () => import('./DataTable').then((mod) => mod.DataTable),
    {
        ssr: false,
        loading: () => <DataTableSkeleton />,
    }
);

// Re-export types
export type {
    ColumnDef,
    DataTableProps,
    PaginationProps,
    InfiniteScrollProps,
    SelectableProps,
    ActionsProps,
    TableVariant,
    TableStyles,
} from './types';
