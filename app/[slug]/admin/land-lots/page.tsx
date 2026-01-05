'use client';

import React, { useState } from 'react';
import { 
    Search, 
    ChevronLeft, 
    ChevronRight,
    Info,
    Building2
} from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import GisMapContainer from '@/app/_lib/features/gis/components/GisMapContainer';
import ParcelDetailModal from '@/app/_lib/features/gis/components/ParcelDetailModal';

// 건물 유형 한글 매핑
const BUILDING_TYPE_LABELS: Record<string, string> = {
    DETACHED_HOUSE: '단독',
    VILLA: '다세대/빌라',
    APARTMENT: '아파트',
    COMMERCIAL: '상업',
    MIXED: '복합',
    NONE: '미분류',
};

// 금액 포맷팅 함수
function formatPrice(price: number | null | undefined): string {
    if (!price) return '-';
    if (price >= 100000000) {
        return `${(price / 100000000).toFixed(1)}억원`;
    } else if (price >= 10000) {
        return `${(price / 10000).toFixed(0)}만원`;
    }
    return `${price.toLocaleString()}원`;
}

interface ExtendedLandLot {
    id: string;
    union_id: string;
    pnu: string;
    address_text: string | null;
    land_area: number | null;
    created_at: string;
    // land_lots 테이블에서 조인된 정보
    official_price: number | null;
    owner_count: number | null;
    // buildings 테이블에서 조인된 정보
    building_type: string | null;
}

export default function LandLotManagementPage() {
    const { union } = useSlug();
    const unionId = union?.id;

    const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 15;

    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPnu, setSelectedPnu] = useState<string | null>(null);

    // 지번 목록 조회 (확장된 정보 포함)
    const { data: landLotsData, isLoading: isLotsLoading } = useQuery({
        queryKey: ['union-land-lots-extended', unionId, searchQuery, page],
        queryFn: async () => {
            if (!unionId) return { lots: [], total: 0 };
            
            // 먼저 union_land_lots에서 기본 데이터 조회
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

            const { data: lotsData, error: lotsError, count } = await query;
            if (lotsError) throw lotsError;

            if (!lotsData || lotsData.length === 0) {
                return { lots: [], total: count || 0 };
            }

            // PNU 목록 추출
            const pnuList = lotsData.map(lot => lot.pnu);

            // land_lots에서 추가 정보 조회
            const { data: landLotsInfo } = await supabase
                .from('land_lots')
                .select('pnu, official_price, owner_count')
                .in('pnu', pnuList);

            // buildings에서 건물 유형 조회
            const { data: buildingsInfo } = await supabase
                .from('buildings')
                .select('pnu, building_type')
                .in('pnu', pnuList);

            // 데이터 병합
            const extendedLots: ExtendedLandLot[] = lotsData.map(lot => {
                const landInfo = landLotsInfo?.find(l => l.pnu === lot.pnu);
                const buildingInfo = buildingsInfo?.find(b => b.pnu === lot.pnu);
                
                return {
                    ...lot,
                    official_price: landInfo?.official_price || null,
                    owner_count: landInfo?.owner_count || null,
                    building_type: buildingInfo?.building_type || null,
                };
            });

            return { lots: extendedLots, total: count || 0 };
        },
        enabled: !!unionId,
    });

    const totalPages = Math.ceil((landLotsData?.total || 0) / pageSize);

    // 행 클릭 핸들러
    const handleRowClick = (pnu: string) => {
        setSelectedPnu(pnu);
        setIsModalOpen(true);
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
                    <p className="text-gray-500 text-sm mt-1">우리 구역의 전체 지번 목록과 GIS 지도 현황, 가입율/동의율을 확인합니다.</p>
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
                        대시보드
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
                        리스트
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

                    {/* 테이블: 번호, 주소, 면적, 유형, 공시지가, 소유주수 */}
                    <div className="flex-1 overflow-x-auto text-[14px]">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-600 w-16 text-center">번호</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600">주소</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600 text-right w-24">면적(㎡)</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600 text-center w-28">유형</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600 text-right w-28">공시지가</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600 text-center w-24">소유주수</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLotsLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-8 mx-auto"></div></td>
                                            <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                                            <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-16 ml-auto"></div></td>
                                            <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-16 mx-auto"></div></td>
                                            <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-20 ml-auto"></div></td>
                                            <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-8 mx-auto"></div></td>
                                        </tr>
                                    ))
                                ) : landLotsData?.lots.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                                            데이터가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    landLotsData?.lots.map((lot, index) => (
                                        <tr 
                                            key={lot.id} 
                                            className="hover:bg-primary/5 transition-colors cursor-pointer"
                                            onClick={() => handleRowClick(lot.pnu)}
                                        >
                                            <td className="px-4 py-4 text-center text-gray-500">
                                                {(page - 1) * pageSize + index + 1}
                                            </td>
                                            <td className="px-4 py-4 font-medium text-gray-900">{lot.address_text || '-'}</td>
                                            <td className="px-4 py-4 text-right text-gray-600">
                                                {lot.land_area?.toLocaleString() || '-'}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {lot.building_type ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700">
                                                        <Building2 className="w-3 h-3" />
                                                        {BUILDING_TYPE_LABELS[lot.building_type] || lot.building_type}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right text-gray-600">
                                                {formatPrice(lot.official_price)}
                                            </td>
                                            <td className="px-4 py-4 text-center text-gray-600">
                                                {lot.owner_count ?? '-'}
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

            {/* 필지 상세 모달 */}
            <ParcelDetailModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                pnu={selectedPnu}
                stageId={null}
                unionId={unionId}
                onDeleted={() => setSelectedPnu(null)}
            />
        </div>
    );
}
