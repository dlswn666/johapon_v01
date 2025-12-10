'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';

interface LoginFormProps {
    className?: string;
    unionName?: string;
    onLoginSuccess?: () => void;
}

/**
 * 로그인 폼 컴포넌트
 * - 아이디/비밀번호 입력
 * - 소셜 로그인 버튼 (카카오, 네이버)
 * - 테스트 로그인 버튼
 */
export function LoginForm({ className, unionName: _unionName, onLoginSuccess }: LoginFormProps) {
    const { switchUser } = useAuth();
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // TODO: 실제 로그인 API 호출 구현
            // 현재는 테스트용으로 Mock 처리
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            // 임시: 아이디가 'admin'이면 로그인 성공 처리
            if (userId === 'admin') {
                switchUser('systemAdmin');
                onLoginSuccess?.();
            } else {
                setError('아이디 또는 비밀번호가 일치하지 않습니다.');
            }
        } catch (_err) {
            setError('로그인 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestLogin = () => {
        switchUser('systemAdmin');
        onLoginSuccess?.();
    };

    const handleKakaoLogin = () => {
        // TODO: 카카오 OAuth 구현
        alert('카카오 로그인은 추후 구현 예정입니다.');
    };

    const handleNaverLogin = () => {
        // TODO: 네이버 OAuth 구현
        alert('네이버 로그인은 추후 구현 예정입니다.');
    };

    return (
        <div
            className={cn(
                'w-full max-w-[400px] bg-white rounded-xl shadow-2xl p-8',
                'mx-4 md:mx-0',
                className
            )}
        >
            {/* 로그인 타이틀 */}
            <h2 className="text-2xl font-bold text-center text-[#4E8C6D] mb-8">
                로그인
            </h2>

            <form onSubmit={handleLogin} className="space-y-5">
                {/* 아이디 입력 */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        이메일 또는 아이디
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            placeholder="이메일 또는 아이디를 입력하세요"
                            className={cn(
                                'w-full h-12 pl-12 pr-4 rounded-lg border border-gray-300',
                                'text-base placeholder:text-gray-400',
                                'focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent',
                                'transition-all'
                            )}
                        />
                    </div>
                </div>

                {/* 비밀번호 입력 */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        비밀번호
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호를 입력하세요"
                            className={cn(
                                'w-full h-12 pl-12 pr-12 rounded-lg border border-gray-300',
                                'text-base placeholder:text-gray-400',
                                'focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent',
                                'transition-all'
                            )}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? (
                                <EyeOff className="w-5 h-5" />
                            ) : (
                                <Eye className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>

                {/* 로그인 상태 유지 & 비밀번호 찾기 */}
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-[#4E8C6D] focus:ring-[#4E8C6D]"
                        />
                        <span className="text-sm text-gray-600">로그인 상태 유지</span>
                    </label>
                    <button
                        type="button"
                        className="text-sm text-[#4E8C6D] hover:underline"
                    >
                        비밀번호 찾기
                    </button>
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <p className="text-sm text-red-500 text-center">{error}</p>
                )}

                {/* 로그인 버튼 */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                        'w-full h-12 rounded-lg font-medium text-white',
                        'bg-[#4E8C6D] hover:bg-[#3d7058]',
                        'transition-colors',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                >
                    {isLoading ? '로그인 중...' : '로그인'}
                </button>
            </form>

            {/* 구분선 */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm text-gray-500">
                        소셜 계정으로 로그인
                    </span>
                </div>
            </div>

            {/* 소셜 로그인 버튼 */}
            <div className="flex gap-3">
                {/* 카카오 로그인 */}
                <button
                    type="button"
                    onClick={handleKakaoLogin}
                    className={cn(
                        'flex-1 h-12 rounded-lg font-medium',
                        'bg-[#FEE500] text-black',
                        'hover:bg-[#e6cf00]',
                        'transition-colors',
                        'flex items-center justify-center gap-2'
                    )}
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3C6.48 3 2 6.48 2 10.5c0 2.52 1.64 4.74 4.12 6.03-.18.65-.65 2.35-.75 2.72-.12.46.17.45.36.33.15-.1 2.37-1.61 3.32-2.26.63.09 1.28.13 1.95.13 5.52 0 10-3.48 10-7.95S17.52 3 12 3z" />
                    </svg>
                </button>

                {/* 네이버 로그인 */}
                <button
                    type="button"
                    onClick={handleNaverLogin}
                    className={cn(
                        'flex-1 h-12 rounded-lg font-medium',
                        'bg-[#03C75A] text-white',
                        'hover:bg-[#02b350]',
                        'transition-colors',
                        'flex items-center justify-center gap-2'
                    )}
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                    </svg>
                </button>
            </div>

            {/* 회원가입 링크 */}
            <p className="mt-6 text-center text-sm text-gray-600">
                계정이 없으신가요?{' '}
                <button
                    type="button"
                    className="text-[#4E8C6D] font-medium hover:underline"
                >
                    회원가입
                </button>
            </p>

            {/* 테스트 로그인 버튼 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                    type="button"
                    onClick={handleTestLogin}
                    className={cn(
                        'w-full h-10 rounded-lg text-sm font-medium',
                        'bg-gray-100 text-gray-600',
                        'hover:bg-gray-200',
                        'transition-colors'
                    )}
                >
                    🔧 테스트 로그인 (관리자 권한)
                </button>
            </div>
        </div>
    );
}

export default LoginForm;

