'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { Database } from '@/app/_lib/shared/type/database.types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type Union = Database['public']['Tables']['unions']['Row'];

export default function MarketingPage() {
    const router = useRouter();
    const [unions, setUnions] = useState<Union[]>([]);
    const [selectedSlug, setSelectedSlug] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUnions = async () => {
            try {
                // 5초 타임아웃 설정
                const timeoutId = setTimeout(() => {
                    setIsLoading(false);
                    setError('응답 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.');
                }, 5000);

                const { data, error } = await supabase.from('unions').select('*').order('name');

                clearTimeout(timeoutId);

                if (error) throw error;

                setUnions(data || []);
                if (data && data.length > 0) {
                    setSelectedSlug(data[0].slug);
                }
            } catch (error) {
                console.error('Error fetching unions:', error);
                setError('조합 목록을 불러오는데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUnions();
    }, []);

    const handleNavigate = () => {
        if (selectedSlug) {
            router.push(`/${selectedSlug}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-20 bg-linear-to-b from-white to-gray-50 min-h-screen">
            <div className="text-center space-y-8 max-w-4xl px-4">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900">
                    재개발/재건축 조합을 위한
                    <br />
                    <span className="text-blue-600">올인원 솔루션</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    복잡한 조합 운영, 이제 조합온 하나로 해결하세요.
                    <br />
                    공지사항, 알림톡, 조합원 관리까지 한 번에 처리할 수 있습니다.
                </p>
                <div className="flex gap-4 justify-center pt-8">
                    <button
                        onClick={() => router.push('/contact')}
                        className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        도입 문의하기
                    </button>
                    <button
                        onClick={() => router.push('/features')}
                        className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                        기능 더보기
                    </button>
                </div>
            </div>

            {/* 임시 조합 바로가기 (테스트용) */}
            <div className="mt-20 p-8 border rounded-2xl bg-white shadow-lg max-w-md w-full mx-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-indigo-600" />
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">🛠️ 테스트용 조합 바로가기</h3>

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-2 text-gray-500">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <p className="text-sm">조합 목록을 불러오는 중...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-6 text-red-500 bg-red-50 rounded-lg">
                            <p className="text-sm font-medium">{error}</p>
                            <Button
                                variant="link"
                                className="mt-2 h-auto p-0 text-red-600"
                                onClick={() => window.location.reload()}
                            >
                                다시 시도
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">이동할 조합 선택</label>
                                <Select value={selectedSlug} onValueChange={setSelectedSlug}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="조합을 선택해주세요" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {unions.map((union) => (
                                            <SelectItem key={union.id} value={union.slug}>
                                                {union.name}{' '}
                                                <span className="text-gray-400 text-xs ml-1">(/{union.slug})</span>
                                            </SelectItem>
                                        ))}
                                        {unions.length === 0 && (
                                            <div className="p-2 text-sm text-center text-gray-500">
                                                등록된 조합이 없습니다.
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button onClick={handleNavigate} disabled={!selectedSlug} className="w-full h-11 text-base">
                                해당 조합 페이지로 이동
                            </Button>
                        </>
                    )}
                </div>
                <p className="mt-6 text-xs text-gray-400 text-center bg-gray-50 p-2 rounded">
                    * 이 기능은 개발 및 테스트 목적으로만 제공됩니다.
                </p>
            </div>
        </div>
    );
}
