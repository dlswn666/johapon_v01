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
 * - retryDelay: exponential backoff (최대 30초)
 * - refetchOnWindowFocus: false (탭 전환 시 로딩 이슈 방지를 위해 비활성화)
 * - refetchOnReconnect: 네트워크 재접속 시 자동 리페치
 */

/**
 * Supabase 에러인지 확인하는 함수
 */
interface SupabaseError {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
}

function isSupabaseError(error: unknown): error is SupabaseError {
    return (
        typeof error === 'object' &&
        error !== null &&
        ('code' in error || 'message' in error)
    );
}

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

    // Supabase 에러 처리
    if (isSupabaseError(error)) {
        // PGRST116: 데이터 없음 - 재시도 불필요
        if (error.code === 'PGRST116') {
            return false;
        }
        // 인증 관련 에러 - 재시도 불필요
        if (error.code?.startsWith('AUTH') || error.message?.includes('JWT')) {
            return false;
        }
    }

    // 4xx 에러는 재시도하지 않음 (클라이언트 에러)
    const errorWithResponse = error as { response?: { status?: number }; status?: number };
    const status = errorWithResponse?.response?.status || errorWithResponse?.status;
    if (status && status >= 400 && status < 500) {
        return false;
    }

    return true;
}

/**
 * Exponential backoff 재시도 지연 함수
 * 최대 30초까지 지연
 */
function getRetryDelay(attemptIndex: number): number {
    return Math.min(1000 * 2 ** attemptIndex, 30000);
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
            retryDelay: getRetryDelay, // Exponential backoff
            refetchOnWindowFocus: false, // 탭 전환 시 자동 리페치 비활성화 (로딩 이슈 방지)
            refetchOnReconnect: true,
            refetchOnMount: true,
            // 네트워크 오프라인 시에도 캐시된 데이터 표시
            networkMode: 'offlineFirst',
        },
        mutations: {
            retry: false, // Mutation은 기본적으로 재시도하지 않음
            networkMode: 'offlineFirst',
        },
    },
    queryCache: new QueryCache({
        onError: (error: Error, query) => {
            // 전역 Query 에러 처리
            const errorMessage = error?.message || '';
            const supabaseError = error as Error & SupabaseError & { response?: { status?: number }; status?: number };
            
            // 에러 메시지가 없거나 빈 에러 객체인 경우 (삭제 후 타이밍 이슈 등) 경고로 처리
            if (!errorMessage || Object.keys(error).length === 0) {
                console.warn('Query Warning (non-critical):', {
                    queryKey: query.queryKey,
                    timestamp: new Date().toISOString(),
                });
                return; // 토스트 알림 건너뛰기
            }

            // Supabase 특정 에러 코드 처리
            const errorCode = supabaseError.code || '';
            
            // PGRST116: 데이터 없음 (삭제된 데이터 조회 시도 등)
            if (errorCode === 'PGRST116' || 
                errorMessage.includes('Cannot coerce the result') || 
                errorMessage.includes('0 rows')) {
                console.warn('Query Warning (data not found):', {
                    queryKey: query.queryKey,
                    code: errorCode,
                    timestamp: new Date().toISOString(),
                });
                return; // 토스트 알림 건너뛰기
            }

            // 인증 관련 에러 (JWT 만료 등)
            if (errorCode.startsWith('AUTH') || errorMessage.includes('JWT')) {
                console.warn('Query Warning (auth error):', {
                    queryKey: query.queryKey,
                    code: errorCode,
                    timestamp: new Date().toISOString(),
                });
                // 인증 에러는 별도 처리 (로그아웃 등)
                return;
            }

            // 네트워크 에러
            if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
                console.error('Query Network Error:', {
                    message: errorMessage,
                    name: error?.name || 'NetworkError',
                    queryKey: query.queryKey,
                    timestamp: new Date().toISOString(),
                });
                if (!query.meta?.skipErrorToast) {
                    toast.error('네트워크 연결을 확인해주세요.');
                }
                return;
            }

            // 일반 에러 로깅
            const status = supabaseError?.response?.status || supabaseError?.status;
            
            // 에러 객체를 안전하게 직렬화
            const errorDetails: {
                message: string;
                code: string;
                status: number | undefined;
                name: string;
                stack: string | undefined;
                details?: string;
                hint?: string;
            } = {
                message: errorMessage,
                code: errorCode,
                status,
                name: error?.name || 'Unknown',
                stack: error?.stack ? error.stack.substring(0, 200) : undefined, // 스택 추적 일부만
            };
            
            // Supabase 에러의 추가 정보
            if (isSupabaseError(error)) {
                errorDetails.details = supabaseError.details;
                errorDetails.hint = supabaseError.hint;
            }
            
            console.error('Query Error:', {
                ...errorDetails,
                queryKey: query.queryKey,
                timestamp: new Date().toISOString(),
            });

            // 사용자에게 에러 알림
            if (!query.meta?.skipErrorToast) {
                toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
            }
        },
        onSuccess: (_data, query) => {
            // 개발 환경에서만 성공 로그 출력
            if (process.env.NODE_ENV === 'development') {
                console.log('Query Success:', {
                    queryKey: query.queryKey,
                    timestamp: new Date().toISOString(),
                });
            }
        },
    }),
    mutationCache: new MutationCache({
        onError: (error: Error, variables, _context, mutation) => {
            // 전역 Mutation 에러 처리
            const errorMessage = error?.message || '';
            const supabaseError = error as Error & SupabaseError & { response?: { status?: number }; status?: number };
            const errorCode = supabaseError.code || '';
            const status = supabaseError?.response?.status || supabaseError?.status;

            // 네트워크 에러
            if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
                console.error('Mutation Network Error:', {
                    message: errorMessage,
                    name: error?.name || 'NetworkError',
                    mutationKey: mutation.options.mutationKey,
                    timestamp: new Date().toISOString(),
                });
                if (!mutation.meta?.skipErrorToast) {
                    toast.error('네트워크 연결을 확인해주세요.');
                }
                return;
            }

            // 일반 에러 로깅
            // 에러 객체를 안전하게 직렬화
            const errorDetails: {
                message: string;
                code: string;
                status: number | undefined;
                name: string;
                stack: string | undefined;
                details?: string;
                hint?: string;
            } = {
                message: errorMessage,
                code: errorCode,
                status,
                name: error?.name || 'Unknown',
                stack: error?.stack ? error.stack.substring(0, 200) : undefined, // 스택 추적 일부만
            };
            
            // Supabase 에러의 추가 정보
            if (isSupabaseError(error)) {
                errorDetails.details = supabaseError.details;
                errorDetails.hint = supabaseError.hint;
            }
            
            console.error('Mutation Error:', {
                ...errorDetails,
                mutationKey: mutation.options.mutationKey,
                variables,
                timestamp: new Date().toISOString(),
            });

            // 사용자에게 에러 알림
            if (!mutation.meta?.skipErrorToast) {
                toast.error('작업 중 오류가 발생했습니다.');
            }
        },
        onSuccess: (_data, _variables, _context, mutation) => {
            // 개발 환경에서만 성공 로그 출력
            if (process.env.NODE_ENV === 'development') {
                console.log('Mutation Success:', {
                    mutationKey: mutation.options.mutationKey,
                    timestamp: new Date().toISOString(),
                });
            }
        },
    }),
});

export default queryClient;
