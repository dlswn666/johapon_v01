'use client';

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import toast from 'react-hot-toast';

/**
 * TanStack Query 전역 클라이언트 설정
 *
 * 전역 QueryClient 인스턴스를 생성하고 기본 설정을 적용합니다.
 *
 * 주요 설정:
 * - staleTime: 5분 (데이터가 fresh 상태로 유지되는 시간)
 * - gcTime: 10분 (가비지 컬렉션 시간)
 * - retry: 4xx 에러는 재시도하지 않음, 최대 2번 재시도
 * - refetchOnWindowFocus: 브라우저 포커스 시 자동 리페치
 * - refetchOnReconnect: 네트워크 재접속 시 자동 리페치
 */

/**
 * Query 실패 시 재시도 여부를 결정하는 함수
 *
 * @param failureCount - 실패 횟수
 * @param error - 에러 객체
 * @returns 재시도 여부
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
    // 최대 2번까지만 재시도
    if (failureCount >= 2) {
        return false;
    }

    // 4xx 에러는 재시도하지 않음 (클라이언트 에러)
    const errorWithResponse = error as { response?: { status?: number } };
    if (
        errorWithResponse?.response?.status &&
        errorWithResponse.response.status >= 400 &&
        errorWithResponse.response.status < 500
    ) {
        return false;
    }

    return true;
}

/**
 * 전역 QueryClient 인스턴스
 *
 * @example
 * ```typescript
 * import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
 *
 * // 쿼리 무효화
 * queryClient.invalidateQueries({ queryKey: ['users'] });
 *
 * // 쿼리 데이터 가져오기
 * const data = queryClient.getQueryData(['users']);
 * ```
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5분
            gcTime: 10 * 60 * 1000, // 10분 (구 cacheTime)
            retry: shouldRetry,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchOnMount: true,
        },
        mutations: {
            retry: false, // Mutation은 기본적으로 재시도하지 않음
        },
    },
    queryCache: new QueryCache({
        onError: (error: Error, query) => {
            // 전역 Query 에러 처리
            const errorWithResponse = error as Error & { response?: { status?: number } };
            
            // 에러 메시지가 없거나 빈 에러 객체인 경우 (삭제 후 타이밍 이슈 등) 경고로 처리
            const errorMessage = error?.message || '';
            if (!errorMessage || Object.keys(error).length === 0) {
                console.warn('Query Warning (non-critical):', {
                    queryKey: query.queryKey,
                    timestamp: new Date().toISOString(),
                });
                return; // 토스트 알림 건너뛰기
            }

            // 삭제된 데이터 조회 시도 에러 (PGRST116 - single row expected but 0 rows found)
            // 이 에러는 데이터가 삭제된 후 페이지 이동 중에 발생할 수 있음
            if (errorMessage.includes('Cannot coerce the result') || 
                errorMessage.includes('PGRST116') ||
                errorMessage.includes('0 rows')) {
                console.warn('Query Warning (data not found - possibly deleted):', {
                    queryKey: query.queryKey,
                    timestamp: new Date().toISOString(),
                });
                return; // 토스트 알림 건너뛰기
            }

            console.error('Query Error:', {
                error: errorMessage,
                queryKey: query.queryKey,
                status: errorWithResponse?.response?.status,
                timestamp: new Date().toISOString(),
            });

            // 사용자에게 에러 알림 (선택적)
            // 특정 쿼리에서 개별적으로 처리하는 경우 중복 알림 방지
            if (!query.meta?.skipErrorToast) {
                toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
            }
        },
        onSuccess: (data, query) => {
            // 전역 Query 성공 처리 (필요 시)
            console.log('Query Success:', {
                queryKey: query.queryKey,
                timestamp: new Date().toISOString(),
            });
        },
    }),
    mutationCache: new MutationCache({
        onError: (error: Error, variables, context, mutation) => {
            // 전역 Mutation 에러 처리
            const errorWithResponse = error as Error & { response?: { status?: number } };
            console.error('Mutation Error:', {
                error: error?.message || error,
                mutationKey: mutation.options.mutationKey,
                variables,
                status: errorWithResponse?.response?.status,
                timestamp: new Date().toISOString(),
            });

            // 사용자에게 에러 알림 (선택적)
            if (!mutation.meta?.skipErrorToast) {
                toast.error('작업 중 오류가 발생했습니다.');
            }
        },
        onSuccess: (data, variables, context, mutation) => {
            // 전역 Mutation 성공 처리 (필요 시)
            console.log('Mutation Success:', {
                mutationKey: mutation.options.mutationKey,
                timestamp: new Date().toISOString(),
            });
        },
    }),
});

export default queryClient;
