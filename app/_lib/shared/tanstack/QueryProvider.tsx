'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Toaster, resolveValue } from 'react-hot-toast';
import { Toast } from '@/app/_lib/widgets/common/toast/Toast';
import { queryClient } from './queryClient';

// Dynamically import DevTools only in development
const ReactQueryDevtools = dynamic(
    () =>
        import('@tanstack/react-query-devtools').then(
            (mod) => mod.ReactQueryDevtools
        ),
    {
        ssr: false,
    }
);

/**
 * Providers 컴포넌트
 *
 * TanStack Query Provider와 Toast 알림을 제공합니다.
 */
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 3000,
                }}
            >
                {(t) => (
                    <Toast
                        t={t}
                        status={
                            t.type === 'loading'
                                ? 'loading'
                                : t.type === 'success'
                                ? 'success'
                                : t.type === 'error'
                                ? 'error'
                                : 'info'
                        }
                        message={resolveValue(t.message, t)}
                    />
                )}
            </Toaster>
        </QueryClientProvider>
    );
}
