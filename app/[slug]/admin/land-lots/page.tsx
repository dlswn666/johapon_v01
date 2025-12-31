'use client';

import React, { useState } from 'react';
import { 
    Search, 
    ChevronLeft, 
    ChevronRight,
    Info
} from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface LandLot {
    id: string;
    union_id: string;
    pnu: string;
    address_text: string | null;
    land_area: number | null;
    created_at: string;
}

import GisMapContainer from '@/app/_lib/features/gis/components/GisMapContainer';

export default function LandLotManagementPage() {
    const { union } = useSlug();
    const unionId = union?.id;

    const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 15;

    // 지번 목록 조회
    const { data: landLotsData, isLoading: isLotsLoading } = useQuery({
        queryKey: ['union-land-lots', unionId, searchQuery, page],
        queryFn: async () => {
            if (!unionId) return { lots: [], total: 0 };
            
            let query = supabase
                .from('union_land_lots')
                .select('*', { count: 'exact' })
                .eq('union_id', unionId)
                .order('created_at', { ascending: false });

            if (searchQuery) {
                query = query.or(`address_text.ilike.%${searchQuery}%,pnu.ilike.%${searchQuery}%`);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;

            return { lots: data as LandLot[], total: count || 0 };
        },
        enabled: !!unionId,
    });

    const totalPages = Math.ceil((landLotsData?.total || 0) / pageSize);

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">지번 및 GIS 관리</h1>
                    <p className="text-gray-500 text-sm mt-1">우리 구역의 전체 지번 목록과 GIS 지도 현황을 확인합니다.</p>
                </div>
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                    <button 
                        onClick={() => setViewMode('map')}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer",
                            viewMode === 'map' 
                                ? "bg-white shadow-sm text-primary" 
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        )}
                    >
                        지도 보기
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer",
                            viewMode === 'list' 
                                ? "bg-white shadow-sm text-primary" 
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        )}
                    >
                        리스트 보기
                    </button>
                </div>
            </div>

            {/* 안내 사항 */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">안내 사항</p>
                    <ul className="list-disc list-inside space-y-0.5 opacity-90">
                        <li>지번 및 필지 데이터는 시스템 관리자에 의해 정기적으로 업데이트됩니다.</li>
                        <li>데이터 수집 및 배포가 완료된 후에 지도가 활성화됩니다.</li>
                        <li>수정이 필요한 경우 본사 시스템 운영부로 문의해 주세요.</li>
                    </ul>
                </div>
            </div>

            {viewMode === 'map' ? (
                <GisMapContainer />
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                    {/* 검색 바 */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="주소 또는 PNU로 검색..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                            />
                        </div>
                        <div className="text-sm text-gray-500">
                            총 <span className="font-bold text-gray-900">{landLotsData?.total || 0}</span>개의 지번
                        </div>
                    </div>

                    {/* 테이블 */}
                    <div className="flex-1 overflow-x-auto text-[14px]">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 font-semibold text-gray-600">PNU (고유번호)</th>
                                    <th className="px-6 py-3 font-semibold text-gray-600">주소</th>
                                    <th className="px-6 py-3 font-semibold text-gray-600 text-right">면적(㎡)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLotsLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-48"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : landLotsData?.lots.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                                            데이터가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    landLotsData?.lots.map((lot) => (
                                        <tr key={lot.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-gray-500">{lot.pnu}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{lot.address_text}</td>
                                            <td className="px-6 py-4 text-right text-gray-600">
                                                {lot.land_area?.toLocaleString() || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-white transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = page <= 3 ? i + 1 : page + i - 2;
                                    if (pageNum > totalPages) pageNum = totalPages - (Math.min(5, totalPages) - i - 1);
                                    if (pageNum < 1) pageNum = 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={cn(
                                                "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                                                page === pageNum ? "bg-primary text-white shadow-sm" : "hover:bg-white border border-transparent hover:border-gray-200 text-gray-500"
                                            )}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-white transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
