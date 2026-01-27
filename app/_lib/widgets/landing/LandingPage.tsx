'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { CrossfadeBackground } from './CrossfadeBackground';
import { LoginForm } from './LoginForm';
import { RegisterModal, InviteData } from '@/app/_lib/widgets/modal/RegisterModal';
import { AuthProvider } from '@/app/_lib/shared/type/auth.types';

interface LandingPageProps {
    unionName: string;
    onLoginSuccess?: () => void;
    className?: string;
}

interface PrefillDataState {
    inviteData: InviteData | null;
    provider: AuthProvider;
    prefillName: string;
    prefillPhone: string;
}

/**
 * 쿠키에서 prefill 데이터 읽기
 */
function getPrefillDataFromCookie(): PrefillDataState {
    if (typeof document === 'undefined') {
        return { inviteData: null, provider: 'kakao', prefillName: '', prefillPhone: '' };
    }

    try {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        const prefillCookie = cookies['register-prefill'];

        if (!prefillCookie) {
            return { inviteData: null, provider: 'kakao', prefillName: '', prefillPhone: '' };
        }

        const prefillData = JSON.parse(decodeURIComponent(prefillCookie));

        // 초대 링크 데이터인 경우
        if (prefillData.invite_token) {
            return {
                inviteData: {
                    name: prefillData.name || '',
                    phone_number: prefillData.phone_number || '',
                    property_address: prefillData.property_address || '',
                    invite_type: prefillData.invite_type,
                    invite_token: prefillData.invite_token,
                },
                provider: prefillData.provider || 'kakao',
                prefillName: prefillData.name || '',
                prefillPhone: prefillData.phone_number || '',
            };
        }

        // 일반 prefill 데이터 (네이버 등에서 온 경우)
        return {
            inviteData: null,
            provider: prefillData.provider || 'kakao',
            prefillName: prefillData.name || '',
            prefillPhone: prefillData.phone_number || '',
        };
    } catch {
        return { inviteData: null, provider: 'kakao', prefillName: '', prefillPhone: '' };
    }
}

/**
 * prefill 쿠키 삭제
 */
function clearPrefillCookie() {
    if (typeof document === 'undefined') return;
    document.cookie = 'register-prefill=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

/**
 * 조합 랜딩 페이지 컴포넌트
 * - 크로스페이드 배경 (재개발 전 → 후)
 * - 조합명 표시
 * - 로그인 폼
 * - 회원가입 모달 (신규 사용자)
 */
export function LandingPage({ unionName, onLoginSuccess, className }: LandingPageProps) {
    const { authUser, user } = useAuth();
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    // 컴포넌트 마운트 상태 추적 (클라이언트 쿠키 접근을 위해 필요)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHasMounted(true);
    }, []);

    // 쿠키에서 prefill 데이터 읽기 (마운트 후에만)
    const prefillData = useMemo<PrefillDataState>(() => {
        if (!hasMounted) {
            return { inviteData: null, provider: 'kakao', prefillName: '', prefillPhone: '' };
        }
        return getPrefillDataFromCookie();
    }, [hasMounted]);

    // OAuth 인증 후 신규 사용자인 경우 (authUser는 있지만 user가 없음) 자동으로 RegisterModal 표시
    useEffect(() => {
        if (authUser && !user && !isRegisterModalOpen) {
            const timer = setTimeout(() => {
                setIsRegisterModalOpen(true);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [authUser, user, isRegisterModalOpen]);

    const handleRegisterModalClose = () => {
        setIsRegisterModalOpen(false);
        // 모달이 닫힐 때 prefill 쿠키 삭제
        clearPrefillCookie();
    };

    return (
        <div
            className={cn(
                'relative min-h-screen w-full',
                'flex flex-col items-center justify-center',
                'py-8 px-4',
                className
            )}
        >
            {/* 크로스페이드 배경 */}
            <CrossfadeBackground />

            {/* 콘텐츠 영역 */}
            <div className="relative z-10 w-full max-w-[500px] flex flex-col items-center">
                {/* 조합명 */}
                <h1
                    className={cn(
                        'text-3xl md:text-4xl lg:text-5xl font-bold',
                        'text-gray-800 text-center',
                        '[text-wrap:balance]',
                        'mb-8 md:mb-10',
                        'drop-shadow-lg',
                        // 배경 위에서 가독성을 위해 텍스트 섀도우 추가
                        '[text-shadow:_2px_2px_8px_rgba(255,255,255,0.8)]'
                    )}
                >
                    {unionName}
                </h1>

                {/* 로그인 폼 */}
                <LoginForm unionName={unionName} onLoginSuccess={onLoginSuccess} />
            </div>

            {/* 회원가입 모달 (신규 사용자) */}
            <RegisterModal 
                isOpen={isRegisterModalOpen} 
                onClose={handleRegisterModalClose}
                provider={prefillData.provider}
                prefillName={prefillData.prefillName}
                prefillPhone={prefillData.prefillPhone}
                inviteData={prefillData.inviteData}
            />
        </div>
    );
}

export default LandingPage;
