'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { LandingHeader } from './LandingHeader';
import { LandingHero } from './LandingHero';
import { LandingContentGrid } from './LandingContentGrid';
import { LandingFooter } from './LandingFooter';
import { LoginForm } from './LoginForm';
import { RegisterModal, InviteData } from '@/app/_lib/widgets/modal/RegisterModal';
import { AuthProvider } from '@/app/_lib/shared/type/auth.types';

interface LandingPageNewProps {
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
 * 조합 랜딩 페이지 (피그마 디자인 기반)
 * 
 * 구조:
 * - LandingHeader: 로고 + 네비게이션
 * - LandingHero: 캐러셀 배너 + 텍스트 오버레이
 * - Login Section: 로그인 폼
 * - LandingContentGrid: 3단 레이아웃 콘텐츠
 * - LandingFooter: 푸터
 */
export function LandingPageNew({ unionName, onLoginSuccess, className }: LandingPageNewProps) {
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

    // OAuth 인증 후 신규 사용자인 경우 자동으로 RegisterModal 표시
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
        clearPrefillCookie();
    };

    return (
        <div className={cn('flex flex-col min-h-screen bg-white', className)}>
            {/* Header */}
            <LandingHeader unionName={unionName} />

            {/* Hero Section */}
            <LandingHero unionName={unionName} />

            {/* Login Section */}
            <section 
                id="login"
                className={cn(
                    'w-full py-12 md:py-16',
                    'bg-gradient-to-b from-white to-[#F4F5F6]'
                )}
            >
                <div className="max-w-[500px] mx-auto px-4">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-[#333641] mb-2">
                            조합원 로그인
                        </h2>
                        <p className="text-gray-500">
                            {unionName} 조합원이시라면 로그인하세요
                        </p>
                    </div>
                    <LoginForm unionName={unionName} onLoginSuccess={onLoginSuccess} />
                </div>
            </section>

            {/* Content Grid */}
            <LandingContentGrid unionName={unionName} />

            {/* Footer */}
            <LandingFooter unionName={unionName} />

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

export default LandingPageNew;
