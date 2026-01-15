'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Info, Building2, MapPin } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { cn } from '@/lib/utils';
import GisMapContainer from '@/app/_lib/features/gis/components/GisMapContainer';
import ParcelDetailModal from '@/app/_lib/features/gis/components/ParcelDetailModal';
import { DataTable, ColumnDef } from '@/app/_lib/widgets/common/data-table';
import { useLandLotsInfinite, ExtendedLandLot } from '@/app/_lib/features/gis/api/useLandLotsInfinite';

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

// 면적 포맷 함수
function formatArea(area: number | null | undefined): string {
    if (area === null || area === undefined) return '-';
    return `${Number(area).toLocaleString()}`;
}

export default function LandLotManagementPage() {
    const { union } = useSlug();
    const unionId = union?.id;

    const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPnu, setSelectedPnu] = useState<string | null>(null);

    // 검색 디바운스: 1초 후 자동 검색
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchInput);
        }, 1000);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // 무한 스크롤 데이터 조회
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useLandLotsInfinite({
        unionId,
        searchQuery,
        pageSize: 50,
    });

    // 데이터 평탄화
    const landLots = useMemo(() => {
        return data?.pages.flatMap((page) => page.lots) || [];
    }, [data?.pages]);

    const totalCount = data?.pages[0]?.total || 0;

    // 검색 핸들러 (Enter 또는 버튼 클릭 시 즉시 검색)
    const handleSearch = () => {
        setSearchQuery(searchInput);
    };

    // 행 클릭 핸들러
    const handleRowClick = (row: ExtendedLandLot) => {
        setSelectedPnu(row.pnu);
        setIsModalOpen(true);
    };

    // 테이블 컬럼 정의
    const columns: ColumnDef<ExtendedLandLot>[] = useMemo(
        () => [
            {
                key: 'rowNumber',
                header: '번호',
                width: '60px',
                align: 'center',
                render: (_, __, index) => index + 1,
            },
            {
                key: 'address_text',
                header: '주소',
                width: '280px',
                render: (_, row) => (
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate" title={row.address_text || '-'}>
                            {row.address_text || '-'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'land_category',
                header: '지목',
                width: '80px',
                align: 'center',
                render: (_, row) => (
                    <span className="text-gray-600">{row.land_category || '-'}</span>
                ),
            },
            {
                key: 'land_area',
                header: '면적(㎡)',
                width: '100px',
                align: 'right',
                render: (_, row) => (
                    <span className="text-gray-600">{formatArea(row.land_area)}</span>
                ),
            },
            {
                key: 'building_type',
                header: '건물유형',
                width: '110px',
                align: 'center',
                render: (_, row) =>
                    row.building_type ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700">
                            <Building2 className="w-3 h-3" />
                            {BUILDING_TYPE_LABELS[row.building_type] || row.building_type}
                        </span>
                    ) : (
                        <span className="text-gray-400">-</span>
                    ),
            },
            {
                key: 'official_price',
                header: '공시지가',
                width: '110px',
                align: 'right',
                render: (_, row) => (
                    <span className="text-gray-600">{formatPrice(row.official_price)}</span>
                ),
            },
            {
                key: 'owner_count',
                header: '소유주수',
                width: '80px',
                align: 'center',
                render: (_, row) => (
                    <span className="text-gray-600">{row.owner_count ?? '-'}</span>
                ),
            },
        ],
        []
    );

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        우리 구역의 전체 지번 목록과 GIS 지도 현황, 가입율/동의율을 확인합니다.
                    </p>
                </div>
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                    <button
                        onClick={() => setViewMode('map')}
                        className={cn(
                            'px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer',
                            viewMode === 'map'
                                ? 'bg-white shadow-sm text-primary'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        )}
                    >
                        대시보드
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            'px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer',
                            viewMode === 'list'
                                ? 'bg-white shadow-sm text-primary'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        )}
                    >
                        리스트
                    </button>
                </div>
            </div>

            {/* 안내 사항 - 상세 내용은 tooltip으로 표시 */}
            <div className="flex items-center gap-2 text-sm text-blue-700">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1.5 cursor-help">
                            <Info className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">안내 사항</span>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-left">
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>지번 및 필지 데이터는 시스템 관리자에 의해 정기적으로 업데이트됩니다.</li>
                            <li>데이터 수집 및 배포가 완료된 후에 지도가 활성화됩니다.</li>
                            <li>수정이 필요한 경우 본사 시스템 운영부로 문의해 주세요.</li>
                        </ul>
                    </TooltipContent>
                </Tooltip>
            </div>

            {viewMode === 'map' ? (
                <GisMapContainer />
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                    {/* 검색 바 */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="주소로 검색..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                검색
                            </button>
                        </div>
                        <div className="text-sm text-gray-500">
                            총 <span className="font-bold text-gray-900">{totalCount}</span>개의 지번
                        </div>
                    </div>

                    {/* 무한 스크롤 테이블 */}
                    <div className="flex-1">
                        <DataTable
                            data={landLots}
                            columns={columns}
                            keyExtractor={(row) => row.pnu}
                            isLoading={isLoading}
                            emptyMessage="데이터가 없습니다."
                            onRowClick={handleRowClick}
                            maxHeight="calc(100vh - 400px)"
                            stickyHeader
                            infiniteScroll={{
                                hasNextPage: hasNextPage ?? false,
                                isFetchingNextPage,
                                fetchNextPage,
                            }}
                        />
                    </div>
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
