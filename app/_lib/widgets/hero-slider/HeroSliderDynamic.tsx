'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

function HeroSliderSkeleton() {
    return (
        <div className="relative w-full aspect-[21/9] md:aspect-[21/7] bg-gray-100 rounded-lg overflow-hidden">
            <Skeleton className="absolute inset-0" />
            {/* Navigation dots skeleton */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-2 w-2 rounded-full" />
                ))}
            </div>
        </div>
    );
}

export const HeroSliderDynamic = dynamic(
    () => import('./HeroSlider').then((mod) => mod.HeroSlider),
    {
        ssr: false,
        loading: () => <HeroSliderSkeleton />,
    }
);
