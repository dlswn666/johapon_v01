'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster, resolveValue } from 'react-hot-toast';
import { Toast } from '@/app/_lib/widgets/common/toast/Toast';
import { queryClient } from './queryClient';

/**
 * Providers 컴포넌트
 *
 * TanStack Query Provider와 Toast 알림을 제공합니다.
 */
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
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
