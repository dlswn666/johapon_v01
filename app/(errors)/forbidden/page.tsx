'use client';

import { useRouter } from 'next/navigation';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForbiddenPage() {
    const router = useRouter();

    // URL에서 slug 추출 (예: /test-union/admin/... -> test-union)
    const getHomeUrl = () => {
        // 이전 페이지 URL에서 slug 추출 시도
        if (typeof window !== 'undefined') {
            const referrer = document.referrer;
            if (referrer) {
                try {
                    const url = new URL(referrer);
                    const pathParts = url.pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0) {
                        const potentialSlug = pathParts[0];
                        // 마케팅 페이지 경로가 아닌 경우에만 slug로 판단
                        const marketingPaths = ['contact', 'privacy', 'terms', 'auth', 'api', 'invite', 'member-invite', 'systemAdmin', 'admin', 'swagger'];
                        if (!marketingPaths.includes(potentialSlug) && !potentialSlug.startsWith('(')) {
                            return `/${potentialSlug}`;
                        }
                    }
                } catch {
                    // referrer 파싱 실패 시 무시
                }
            }
        }
        return '/';
    };

    const handleGoHome = () => {
        const homeUrl = getHomeUrl();
        router.push(homeUrl);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
                <CardHeader className="text-center space-y-4 pb-6">
                    <div className="mx-auto w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center">
                        <ShieldX className="w-8 h-8 text-orange-400" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-white">접근 권한이 없습니다</CardTitle>
                        <CardDescription className="text-slate-400 mt-2">
                            이 페이지에 접근할 권한이 없습니다.
                            <br />
                            로그인 상태를 확인하거나 관리자에게 문의해 주세요.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button
                        onClick={handleGoHome}
                        className="w-full bg-primary hover:bg-primary/90"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        홈으로 이동
                    </Button>
                    <Button
                        onClick={() => router.back()}
                        variant="outline"
                        className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        이전 페이지
                    </Button>
                    <p className="text-xs text-slate-500 text-center pt-2">
                        문제가 지속되면 관리자에게 문의해 주세요.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
