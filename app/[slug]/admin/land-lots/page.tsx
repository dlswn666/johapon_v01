'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, Info, Building2, MapPin, Users, X, Loader2, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { cn } from '@/lib/utils';
import { supabase } from '@/app/_lib/shared/supabase/client';
import GisMapContainer, { GisMapContainerRef } from '@/app/_lib/features/gis/components/GisMapContainer';
import ParcelDetailModal from '@/app/_lib/features/gis/components/ParcelDetailModal';
import { DataTable, ColumnDef } from '@/app/_lib/widgets/common/data-table';
import { useLandLotsInfinite, ExtendedLandLot } from '@/app/_lib/features/gis/api/useLandLotsInfinite';
import { EChartsMapDynamic } from '@/app/_lib/features/gis/components/EChartsMapDynamic';
import type { ParcelData } from '@/components/map/EChartsMap';
import { escapeLikeWildcards } from '@/app/_lib/shared/utils/escapeLike';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';

// PDF 용지 사이즈 (mm 단위, 가로x세로 기준)
const PAPER_SIZES: Record<string, { label: string; width: number; height: number }> = {
    A2: { label: 'A2', width: 594, height: 420 },
    A3: { label: 'A3', width: 420, height: 297 },
    A4: { label: 'A4', width: 297, height: 210 },
    B4: { label: 'B4', width: 364, height: 257 },
};

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

    // PDF 프린트 관련 상태
    const mapRef = useRef<GisMapContainerRef>(null);
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const [paperSize, setPaperSize] = useState<string>('A4');
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);

    // 소유주 검색 상태
    const [ownerSearchPnus, setOwnerSearchPnus] = useState<string[]>([]);
    const [searchedOwnerName, setSearchedOwnerName] = useState('');

    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPnu, setSelectedPnu] = useState<string | null>(null);

    // 디바운스 타이머 ref
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 검색 실행 함수 (소유주 이름 → DB 직접 검색, PRE_REGISTERED 포함)
    const executeSearch = useCallback(
        async (input: string) => {
            if (!input.trim()) {
                setSearchQuery('');
                setOwnerSearchPnus([]);
                setSearchedOwnerName('');
                return;
            }

            const query = input.trim();
            const escaped = escapeLikeWildcards(query);

            // 소유주 이름으로 DB 직접 검색 (APPROVED + PRE_REGISTERED 등 모든 상태)
            const { data: ownerData } = await supabase
                .from('user_property_units')
                .select('pnu, users!inner(name)')
                .ilike('users.name', `%${escaped}%`)
                .not('pnu', 'is', null);

            if (ownerData && ownerData.length > 0) {
                const pnus = [...new Set(ownerData.map((d) => d.pnu).filter(Boolean))] as string[];
                const names = [
                    ...new Set(
                        ownerData
                            .map((d) => (d.users as unknown as { name: string })?.name)
                            .filter(Boolean)
                    ),
                ];

                setOwnerSearchPnus(pnus);
                setSearchedOwnerName(names.join(', '));
                setSearchQuery('');
            } else {
                setOwnerSearchPnus([]);
                setSearchedOwnerName('');
                setSearchQuery(input);
            }
        },
        []
    );

    // 검색 디바운스: 1초 후 자동 검색
    useEffect(() => {
        searchTimerRef.current = setTimeout(() => executeSearch(searchInput), 1000);
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [searchInput, executeSearch]);

    // 즉시 검색 핸들러 (Enter 또는 버튼 클릭) - 디바운스 취소 후 즉시 실행
    const handleSearch = () => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        executeSearch(searchInput);
    };

    // 검색 초기화
    const handleClearSearch = () => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        setSearchInput('');
        setSearchQuery('');
        setOwnerSearchPnus([]);
        setSearchedOwnerName('');
    };

    // PDF 다운로드 핸들러
    const handlePdfDownload = useCallback(async () => {
        if (!mapRef.current) return;
        setIsPdfGenerating(true);

        try {
            // 1. 용지 사이즈 계산
            const paper = PAPER_SIZES[paperSize];
            const isLandscape = orientation === 'landscape';
            const pageWidth = isLandscape ? paper.width : paper.height;
            const pageHeight = isLandscape ? paper.height : paper.width;
            const margin = 10;
            const availableWidth = pageWidth - margin * 2;
            const availableHeight = pageHeight - margin * 2;

            // 2. 캔버스를 용지 비율에 맞게 리사이즈 + 줌 리셋
            mapRef.current.prepareForPrint(availableWidth, availableHeight);

            // 3. 렌더링 완료 대기
            await new Promise((resolve) => setTimeout(resolve, 500));

            // 4. 고해상도 PNG 캡처
            const dataURL = mapRef.current.getDataURL(3);

            // 5. 원래 ���태로 복원
            mapRef.current.restoreFromPrint();

            if (!dataURL) {
                setIsPdfGenerating(false);
                return;
            }

            // 6. PDF 생�� — 캡처 이미지가 용지 비율과 동일하므로 꽉 채움
            const pdf = new jsPDF({
                orientation: isLandscape ? 'landscape' : 'portrait',
                unit: 'mm',
                format: [pageWidth, pageHeight],
            });

            pdf.addImage(dataURL, 'PNG', margin, margin, availableWidth, availableHeight);

            // 7. 파일명: 구역도_YYYY-MM-DD.pdf
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            pdf.save(`구역도_${dateStr}.pdf`);

            setIsPdfGenerating(false);
            setPrintDialogOpen(false);
        } catch {
            // 에러 시에도 반드시 복원
            mapRef.current?.restoreFromPrint();
            setIsPdfGenerating(false);
        }
    }, [paperSize, orientation]);

    // 소유주 검색 시 지도 데이터 (필요할 때만 로드)
    const showOwnerMap = ownerSearchPnus.length > 0;

    const { data: mapRawData, isLoading: mapLoading } = useQuery({
        queryKey: ['land-lots-owner-map', unionId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_union_registration_map_data', {
                p_union_id: unionId!,
            });
            if (error) throw error;
            return data;
        },
        enabled: !!unionId && showOwnerMap,
        staleTime: 10 * 60 * 1000,
    });

    // 지도 GeoJSON 및 ParcelData 변환
    const { ownerMapGeoJson, mapParcelData } = useMemo(() => {
        if (!mapRawData || mapRawData.length === 0) {
            return { ownerMapGeoJson: null, mapParcelData: [] };
        }

        const features = mapRawData
            .filter(
                (item: { boundary_geojson: unknown }) => item.boundary_geojson
            )
            .map(
                (item: {
                    pnu: string;
                    address: string | null;
                    boundary_geojson: GeoJSON.Geometry;
                }) => ({
                    type: 'Feature' as const,
                    properties: { name: item.pnu, address: item.address },
                    geometry: item.boundary_geojson,
                })
            );

        const parcelData: ParcelData[] = mapRawData.map(
            (item: { pnu: string; address: string | null }) => ({
                pnu: item.pnu,
                status: 'NO_OWNER' as const,
                address: item.address || undefined,
            })
        );

        return {
            ownerMapGeoJson: {
                type: 'FeatureCollection' as const,
                features,
            } as GeoJSON.FeatureCollection,
            mapParcelData: parcelData,
        };
    }, [mapRawData]);

    // 무한 스크롤 데이터 조회
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useLandLotsInfinite({
        unionId,
        searchQuery,
        pnuFilter: ownerSearchPnus.length > 0 ? ownerSearchPnus : undefined,
        pageSize: 50,
    });

    // 데이터 평탄화
    const landLots = useMemo(() => {
        return data?.pages.flatMap((page) => page.lots) || [];
    }, [data?.pages]);

    const totalCount = data?.pages[0]?.total || 0;

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
        <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-baseline gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
                    <p className="text-gray-400 text-sm">
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
            <div className="flex items-center justify-between text-sm text-blue-700">
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
                {viewMode === 'map' && (
                    <button
                        onClick={() => setPrintDialogOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                        <Printer className="w-4 h-4" />
                        <span>구역도 출력</span>
                    </button>
                )}
            </div>

            {viewMode === 'map' ? (
                <GisMapContainer ref={mapRef} />
            ) : (
                <div className="space-y-4">
                    {/* 소유주 검색 결과 지도 */}
                    {showOwnerMap && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Users className="w-4 h-4 text-primary" />
                                    <span>
                                        소유주 <span className="text-primary font-bold">{searchedOwnerName}</span>의
                                        지번 <span className="text-primary font-bold">{ownerSearchPnus.length}</span>개
                                    </span>
                                </div>
                                <button
                                    onClick={handleClearSearch}
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                >
                                    <X className="w-3 h-3" />
                                    초기화
                                </button>
                            </div>
                            <div style={{ height: '450px' }}>
                                {mapLoading || !ownerMapGeoJson ? (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                            <span className="text-sm text-gray-400">지도 로딩 중...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <EChartsMapDynamic
                                        geoJson={ownerMapGeoJson}
                                        data={mapParcelData}
                                        mode="address"
                                        selectedPnuList={ownerSearchPnus}
                                        onParcelClick={(pnu) => {
                                            setSelectedPnu(pnu);
                                            setIsModalOpen(true);
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* 리스트 */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                        {/* 검색 바 */}
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="주소 또는 소유주 이름으로 검색..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSearch()}
                                        className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                    />
                                    {searchInput && (
                                        <button
                                            onClick={handleClearSearch}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
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

            {/* PDF 출력 다이얼로그 */}
            <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>구역도 PDF 출력</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* 용지 사이즈 */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">용지 사이즈</label>
                            <div className="flex gap-2">
                                {Object.entries(PAPER_SIZES).map(([key, { label }]) => (
                                    <button
                                        key={key}
                                        onClick={() => setPaperSize(key)}
                                        className={cn(
                                            'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer',
                                            paperSize === key
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 방향 */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">방향</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setOrientation('landscape')}
                                    className={cn(
                                        'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer',
                                        orientation === 'landscape'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    )}
                                >
                                    가로
                                </button>
                                <button
                                    onClick={() => setOrientation('portrait')}
                                    className={cn(
                                        'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer',
                                        orientation === 'portrait'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    )}
                                >
                                    세로
                                </button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handlePdfDownload}
                            disabled={isPdfGenerating}
                            className="w-full"
                        >
                            {isPdfGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    PDF 생성 중...
                                </>
                            ) : (
                                <>
                                    <Printer className="w-4 h-4 mr-2" />
                                    PDF 다운로드
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
