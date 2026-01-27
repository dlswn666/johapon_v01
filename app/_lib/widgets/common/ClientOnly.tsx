'use client';

import { ReactNode } from 'react';
import { useIsClient } from '@/app/_lib/shared/hooks/useIsClient';

interface ClientOnlyProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
    const isClient = useIsClient();

    if (!isClient) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
