'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Home, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
    const router = useRouter();

    useEffect(() => {
        // 에러 로깅 (프로덕션에서는 에러 리포팅 서비스로 전송)
        console.error('Application Error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                <CardHeader className="text-center space-y-4 pb-6">
                    <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-white">오류가 발생했습니다</CardTitle>
                        <CardDescription className="text-slate-400 mt-2">
                            죄송합니다. 예기치 않은 오류가 발생했습니다.
                            <br />
                            잠시 후 다시 시도해 주세요.
                        </CardDescription>
                        {error.digest && (
                            <p className="text-slate-500 text-xs mt-2">
                                오류 코드: {error.digest}
                            </p>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button
                        onClick={reset}
                        className="w-full bg-primary hover:bg-primary/90"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        다시 시도
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => router.back()}
                            variant="outline"
                            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            이전 페이지
                        </Button>
                        <Button
                            onClick={() => router.push('/')}
                            variant="outline"
                            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            홈으로
                        </Button>
                    </div>
                    <p className="text-xs text-slate-500 text-center pt-2">
                        문제가 지속되면 관리자에게 문의해 주세요.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
