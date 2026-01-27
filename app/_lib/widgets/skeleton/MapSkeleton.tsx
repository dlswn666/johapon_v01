import { Loader2 } from 'lucide-react';

interface MapSkeletonProps {
    className?: string;
}

export function MapSkeleton({ className = '' }: MapSkeletonProps) {
    return (
        <div className={`flex-1 min-h-[400px] relative bg-slate-100 rounded-xl animate-pulse ${className}`}>
            <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        </div>
    );
}
