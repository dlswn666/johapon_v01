'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

function AuthErrorContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const message = searchParams.get('message');

    const getErrorMessage = (code: string | null) => {
        switch (code) {
            case 'no_code':
                return '인증 코드가 없습니다. 다시 로그인해 주세요.';
            case 'session_error':
                return '세션 생성에 실패했습니다. 다시 시도해 주세요.';
            case 'invalid_token':
                return '유효하지 않은 토큰입니다.';
            case 'expired':
                return '인증이 만료되었습니다. 다시 로그인해 주세요.';
            default:
                return '인증 중 오류가 발생했습니다. 다시 시도해 주세요.';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                <CardHeader className="text-center space-y-4 pb-6">
                    <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-white">인증 오류</CardTitle>
                        <CardDescription className="text-slate-400 mt-2">
                            {getErrorMessage(message)}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={() => router.push('/')}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        홈으로 이동
                    </Button>
                    <p className="text-xs text-slate-500 text-center">
                        문제가 지속되면 관리자에게 문의해 주세요.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
                <Skeleton className="w-full max-w-md h-[400px] rounded-[24px] opacity-20" />
            </div>
        }>
            <AuthErrorContent />
        </Suspense>
    );
}

