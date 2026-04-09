'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { isLocalhost } from '@/app/_lib/shared/utils/isLocalhost';

interface LoginFormProps {
    className?: string;
    unionName?: string;
    onLoginSuccess?: () => void;
}

function getUrlError(searchParams: URLSearchParams): string {
    const authError = searchParams.get('auth_error');
    const inviteError = searchParams.get('invite_error');
    if (authError) {
        const errorMessages: Record<string, string> = {
            'no_code': '로그인 인증에 실패했습니다. 다시 시도해주세요.',
            'session_error': '로그인 처리 중 오류가 발생했습니다.',
        };
        return errorMessages[authError] || '로그인 중 오류가 발생했습니다.';
    } else if (inviteError) {
        const inviteMessages: Record<string, string> = {
            'expired': '초대 링크가 만료되었거나 유효하지 않습니다.',
        };
        return inviteMessages[inviteError] || '초대 처리 중 오류가 발생했습니다.';
    }
    return '';
}

/**
 * 로그인 폼 컴포넌트
 * - 카카오/네이버 소셜 로그인
 * - 개발용 테스트 로그인
 */
export function LoginForm({ className, unionName, onLoginSuccess: _onLoginSuccess }: LoginFormProps) {
    const { login } = useAuth();
    const { slug } = useSlug();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [manualError, setManualError] = useState('');

    const urlError = useMemo(() => getUrlError(searchParams), [searchParams]);
    const error = manualError || urlError;

    const handleKakaoLogin = async () => {
        setManualError('');
        setIsLoading(true);

        try {
            await login('kakao', slug || undefined);
            // 리다이렉트되므로 onLoginSuccess는 호출되지 않음
        } catch (err) {
            console.error('Kakao login error:', err);
            setManualError('카카오 로그인 중 오류가 발생했습니다.');
            setIsLoading(false);
        }
    };

    const handleTestLogin = async (testRole: 'admin' | 'member') => {
        setManualError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/test/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, role: testRole }),
            });
            const data = await res.json();

            if (!res.ok) {
                setManualError(data.error || '테스트 로그인 실패');
                setIsLoading(false);
                return;
            }

            window.location.href = data.redirectTo;
        } catch (err) {
            console.error('Test login error:', err);
            setManualError('테스트 로그인 중 오류 발생');
            setIsLoading(false);
        }
    };

    const _handleNaverLogin = async () => {
        setManualError('');
        setIsLoading(true);

        try {
            await login('naver', slug || undefined);
            // 리다이렉트되므로 onLoginSuccess는 호출되지 않음
        } catch (err) {
            console.error('Naver login error:', err);
            setManualError('네이버 로그인 중 오류가 발생했습니다.');
            setIsLoading(false);
        }
    };


    return (
        <div className={cn('w-full max-w-[400px] bg-white rounded-xl shadow-2xl p-8', 'mx-4 md:mx-0', className)}>
            {/* 로그인 타이틀 */}
            <h2 className="text-2xl font-bold text-center text-brand mb-2">
                {unionName ? `${unionName}` : '조합원 로그인'}
            </h2>
            <p className="text-center text-gray-500 text-sm mb-8">소셜 계정으로 간편하게 로그인하세요</p>

            {/* 에러 메시지 */}
            {error && (
                <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
            )}

            {/* 소셜 로그인 버튼 */}
            <div className="space-y-3">
                {/* 카카오 로그인 */}
                <button
                    type="button"
                    onClick={handleKakaoLogin}
                    disabled={isLoading}
                    className={cn(
                        'w-full h-12 rounded-lg font-medium',
                        'bg-kakao text-kakao-foreground',
                        'hover:bg-kakao',
                        'transition-colors',
                        'flex items-center justify-center gap-3',
                        'cursor-pointer',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3C6.48 3 2 6.48 2 10.5c0 2.52 1.64 4.74 4.12 6.03-.18.65-.65 2.35-.75 2.72-.12.46.17.45.36.33.15-.1 2.37-1.61 3.32-2.26.63.09 1.28.13 1.95.13 5.52 0 10-3.48 10-7.95S17.52 3 12 3z" />
                    </svg>
                    <span>카카오로 시작하기</span>
                </button>

                {/* 네이버 로그인 */}
                {/* <button
                    type="button"
                    onClick={handleNaverLogin}
                    disabled={isLoading}
                    className={cn(
                        'w-full h-12 rounded-lg font-medium',
                        'bg-naver text-white',
                        'hover:bg-naver-hover',
                        'transition-colors',
                        'flex items-center justify-center gap-3',
                        'cursor-pointer',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                    </svg>
                    <span>네이버로 시작하기</span>
                </button> */}

                {/* 테스트 로그인 (localhost only) */}
                {isLocalhost() && (
                    <>
                        <div className="relative my-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-white px-2 text-gray-400">테스트 로그인</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleTestLogin('admin')}
                                disabled={isLoading}
                                className={cn(
                                    'flex-1 h-10 rounded-lg text-sm font-medium',
                                    'bg-blue-500 text-white hover:bg-blue-600',
                                    'transition-colors cursor-pointer',
                                    'disabled:opacity-50 disabled:cursor-not-allowed'
                                )}
                            >
                                관리자 로그인
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTestLogin('member')}
                                disabled={isLoading}
                                className={cn(
                                    'flex-1 h-10 rounded-lg text-sm font-medium',
                                    'bg-gray-500 text-white hover:bg-gray-600',
                                    'transition-colors cursor-pointer',
                                    'disabled:opacity-50 disabled:cursor-not-allowed'
                                )}
                            >
                                조합원 로그인
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* 로딩 상태 */}
            {isLoading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-gray-500">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <span className="text-sm">로그인 중...</span>
                </div>
            )}

            {/* 안내 문구 */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-center text-xs text-gray-500">
                    처음 오셨나요? 소셜 로그인 후 간단한 정보 입력으로
                    <br />
                    조합원 등록을 완료하실 수 있습니다.
                </p>
            </div>

        </div>
    );
}

export default LoginForm;
