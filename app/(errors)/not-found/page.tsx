'use client';

import { useMemo } from 'react';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
    // 이전 페이지 URL에서 slug 추출하여 홈 URL 결정
    const homeUrl = useMemo(() => {
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
    }, []);

    const handleGoHome = () => {
        window.location.href = homeUrl;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-lg w-full text-center">
                {/* 404 숫자 */}
                <div className="relative mb-8">
                    <h1 className="text-[150px] md:text-[200px] font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 leading-none select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 text-[150px] md:text-[200px] font-black text-amber-500/10 blur-2xl leading-none select-none">
                        404
                    </div>
                </div>

                {/* 메시지 */}
                <div className="space-y-4 mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                        페이지를 찾을 수 없습니다
                    </h2>
                    <p className="text-slate-400 text-lg">
                        요청하신 페이지가 존재하지 않거나 이동되었습니다.
                        <br />
                        URL을 다시 확인해 주세요.
                    </p>
                </div>

                {/* 버튼 */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        이전 페이지
                    </button>
                    <button
                        onClick={handleGoHome}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg shadow-orange-500/25"
                    >
                        <Home className="w-5 h-5" />
                        홈으로 이동
                    </button>
                </div>

                {/* 장식 요소 */}
                <div className="mt-16 flex justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse delay-100"></div>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse delay-200"></div>
                </div>
            </div>
        </div>
    );
}

