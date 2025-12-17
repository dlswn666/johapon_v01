'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Building2, AlertCircle, Clock, CheckCircle2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminInviteByToken } from '@/app/_lib/features/admin-invite/api/useAdminInviteHook';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { KAKAO_SERVICE_TERMS_STRING } from '@/app/_lib/shared/constants/kakaoServiceTerms';

// 로딩 컴포넌트
function LoadingState() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="text-lg text-slate-400">초대 정보를 확인하는 중...</p>
            </div>
        </div>
    );
}

// 메인 초대 페이지 컴포넌트
function AdminInviteContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    // [DEBUG] 초대 페이지 마운트
    console.log('[DEBUG] 🎫 관리자 초대 페이지 마운트 (쿼리 파라미터 방식)');
    console.log('[DEBUG] token:', token);

    const { data: invite, isLoading, error } = useAdminInviteByToken(token || '');

    // [DEBUG] 초대 정보 로드 상태
    console.log('[DEBUG] 초대 정보:', {
        isLoading,
        error: error?.message || null,
        invite: invite ? { id: invite.id, name: invite.name, status: invite.status } : null,
    });

    const handleKakaoLogin = async () => {
        if (!token) return;

        // 카카오 로그인 시 state에 invite_token 포함
        const redirectTo = `${window.location.origin}/auth/callback?invite_token=${token}`;

        // [DEBUG] 카카오 로그인 시작
        console.log('[DEBUG] 🔑 카카오 로그인 시작');
        console.log('[DEBUG] redirectTo:', redirectTo);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'kakao',
            options: {
                redirectTo,
                // 카카오싱크: 간편 로그인 + 서비스 약관 동의
                queryParams: {
                    service_terms: KAKAO_SERVICE_TERMS_STRING,
                },
            },
        });

        if (error) {
            console.error('[DEBUG] ❌ Kakao login error:', error);
        } else {
            console.log('[DEBUG] ✅ 카카오 OAuth 리다이렉트 시작...');
        }
    };

    // 토큰이 없는 경우
    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                    <CardHeader className="text-center space-y-4 pb-6">
                        <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold text-white">유효하지 않은 초대</CardTitle>
                            <CardDescription className="text-slate-400 mt-2">
                                초대 토큰이 없습니다. 올바른 링크로 접속해 주세요.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button
                            onClick={() => router.push('/')}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            홈으로 이동
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return <LoadingState />;
    }

    if (error || !invite) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                    <CardHeader className="text-center space-y-4 pb-6">
                        <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold text-white">유효하지 않은 초대</CardTitle>
                            <CardDescription className="text-slate-400 mt-2">
                                초대 링크가 유효하지 않거나 찾을 수 없습니다.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button
                            onClick={() => router.push('/')}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            홈으로 이동
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 이미 사용된 초대
    if (invite.status === 'USED') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                    <CardHeader className="text-center space-y-4 pb-6">
                        <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold text-white">이미 사용된 초대</CardTitle>
                            <CardDescription className="text-slate-400 mt-2">
                                이 초대 링크는 이미 사용되었습니다.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button
                            onClick={() => router.push('/')}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            홈으로 이동
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 만료된 초대
    if (invite.status === 'EXPIRED') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                    <CardHeader className="text-center space-y-4 pb-6">
                        <div className="mx-auto w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                            <Clock className="w-8 h-8 text-amber-400" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold text-white">만료된 초대</CardTitle>
                            <CardDescription className="text-slate-400 mt-2">
                                이 초대 링크의 유효기간이 만료되었습니다.
                                <br />
                                관리자에게 새로운 초대를 요청해 주세요.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button
                            onClick={() => router.push('/')}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            홈으로 이동
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 유효한 초대 - 카카오 로그인 유도
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            {/* 배경 패턴 */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDIwMjAiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0wLTZoLTJWMTJoMnY0em0wLTZoLTJWNmgydjR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />

            <Card className="w-full max-w-md relative z-10 bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                <CardHeader className="text-center space-y-4 pb-6">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <UserPlus className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-white">관리자 초대</CardTitle>
                        <CardDescription className="text-slate-400 mt-2">
                            조합 관리자로 초대되었습니다
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* 초대 정보 */}
                    <div className="p-4 bg-slate-700/50 rounded-xl space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">조합</p>
                                <p className="font-semibold text-white">{invite.union?.name}</p>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-slate-600">
                            <p className="text-sm text-slate-400">초대받은 분</p>
                            <p className="font-medium text-white">{invite.name}</p>
                            {invite.email && (
                                <p className="text-sm text-slate-500">{invite.email}</p>
                            )}
                        </div>
                    </div>

                    {/* 안내 문구 */}
                    <div className="text-center text-sm text-slate-400">
                        <p>카카오 계정으로 간편하게 로그인하면</p>
                        <p>자동으로 관리자로 등록됩니다.</p>
                    </div>

                    {/* 카카오 로그인 버튼 */}
                    <Button
                        onClick={handleKakaoLogin}
                        className="w-full bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-medium py-6 text-lg transition-all duration-200 shadow-lg"
                    >
                        <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3c-5.52 0-10 3.58-10 8 0 2.83 1.88 5.31 4.7 6.7-.15.56-.94 3.54-1 3.8 0 .16.06.3.21.39.15.08.33.06.46-.05l4.4-2.93c.41.05.82.09 1.23.09 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                        </svg>
                        카카오로 시작하기
                    </Button>

                    <p className="text-xs text-slate-500 text-center">
                        이 초대는 {new Date(invite.expires_at).toLocaleString('ko-KR')}까지 유효합니다
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

// useSearchParams()를 사용하려면 Suspense로 감싸야 함
export default function AdminInvitePage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <AdminInviteContent />
        </Suspense>
    );
}

