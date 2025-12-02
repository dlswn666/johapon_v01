'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { Database } from '@/app/_lib/shared/type/database.types';

type Union = Database['public']['Tables']['unions']['Row'];

export default function MarketingPage() {
    const router = useRouter();
    const [unions, setUnions] = useState<Union[]>([]);
    const [selectedSlug, setSelectedSlug] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUnions = async () => {
            try {
                const { data, error } = await supabase.from('unions').select('*').order('name');

                if (error) throw error;

                setUnions(data || []);
                if (data && data.length > 0) {
                    setSelectedSlug(data[0].slug);
                }
            } catch (error) {
                console.error('Error fetching unions:', error);
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
        <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-b from-white to-gray-50">
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
            <div className="mt-20 p-8 border rounded-2xl bg-white shadow-sm max-w-md w-full mx-4">
                <h3 className="text-lg font-bold mb-4">테스트용 조합 바로가기</h3>
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-4 text-gray-500">목록을 불러오는 중...</div>
                    ) : (
                        <>
                            <div className="relative">
                                <select
                                    value={selectedSlug}
                                    onChange={(e) => setSelectedSlug(e.target.value)}
                                    className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                                >
                                    {unions.map((union) => (
                                        <option key={union.id} value={union.slug}>
                                            {union.name} (/{union.slug})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleNavigate}
                                disabled={!selectedSlug}
                                className="w-full bg-gray-900 text-white px-4 py-3 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                해당 조합 페이지로 이동
                            </button>
                        </>
                    )}
                </div>
                <p className="mt-4 text-xs text-gray-500 text-center">* 개발 및 테스트 목적으로 제공되는 기능입니다.</p>
            </div>
        </div>
    );
}
