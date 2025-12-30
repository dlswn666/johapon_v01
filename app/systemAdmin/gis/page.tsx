'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Download,
    Upload,
    Play,
    CheckCircle2,
    AlertCircle,
    Eye,
    Send,
    Table as TableIcon,
    Loader2,
    MapPin,
    RefreshCw,
    Trash2,
    Clock,
    Plus,
    ChevronRight,
    Copy,
    Users,
    Ruler,
    Banknote,
    X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/app/_lib/shared/supabase/client';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { SelectBox } from '@/app/_lib/widgets/common/select-box';
import { useUnions } from '@/app/_lib/features/union-management/api/useUnionManagementHook';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { startGisSync } from '@/app/_lib/features/gis/actions/syncGis';
import { searchAddress, addAddressToUnion } from '@/app/_lib/features/gis/actions/manualAddAddress';
import EChartsMap, { ParcelData } from '@/components/map/EChartsMap';
import { Input } from '@/components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// 작업 기록 타입
interface SyncJob {
    id: string;
    union_id: string;
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress: number;
    is_published: boolean;
    error_log: string | null;
    preview_data: {
        successCount?: number;
        failedCount?: number;
        totalCount?: number;
    } | null;
    created_at: string;
    updated_at: string;
}

// RPC에서 반환하는 필지 데이터 타입
interface RpcParcelData {
    pnu: string;
    address: string;
    area: number | null;
    official_price: number | null;
    owner_count: number | null;
    boundary_geojson: GeoJSON.Geometry | null;
}

// 실패 주소 타입
interface FailedAddress {
    address: string;
    reason: string;
    index: number;
}

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

// 면적 포맷팅 함수
function formatArea(area: number | null | undefined): string {
    if (!area) return '-';
    return `${area.toLocaleString()}㎡`;
}

export default function GisSyncPage() {
    const queryClient = useQueryClient();

    // 기본 상태
    const [selectedUnionId, setSelectedUnionId] = useState<string>('');
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [isNewJobMode, setIsNewJobMode] = useState(false);

    // 새 작업 관련 상태
    const [previewData, setPreviewData] = useState<string[][]>([]);
    const [allAddresses, setAllAddresses] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // 삭제 다이얼로그
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [jobToDelete, setJobToDelete] = useState<string | null>(null);

    // 선택된 필지 (클릭 시 하단에 상세 정보 표시)
    const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);

    // 수동 검색 관련 상태
    const [manualSearchSource, setManualSearchSource] = useState<'vworld' | 'data_portal'>('vworld');
    const [manualSearchAddress, setManualSearchAddress] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<{ address: string; pnu: string } | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // 조합 목록 조회
    const { data: unions, isLoading: isLoadingUnions } = useUnions();
    const unionOptions = unions?.map((u) => ({ value: u.id, label: u.name })) || [];

    // 조합별 작업 기록 조회
    const {
        data: syncJobs,
        isLoading: isLoadingJobs,
        refetch: refetchJobs,
    } = useQuery({
        queryKey: ['sync-jobs', selectedUnionId],
        queryFn: async () => {
            if (!selectedUnionId) return [];

            const { data, error } = await supabase
                .from('sync_jobs')
                .select('*')
                .eq('union_id', selectedUnionId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as SyncJob[];
        },
        enabled: !!selectedUnionId,
        refetchInterval: 5000, // 5초마다 자동 갱신
    });

    // 현재 선택된 작업
    const selectedJob = syncJobs?.find((job) => job.id === selectedJobId);

    // 진행 중인 작업이 있으면 자동 선택
    useEffect(() => {
        if (syncJobs && syncJobs.length > 0 && !selectedJobId && !isNewJobMode) {
            const processingJob = syncJobs.find((job) => job.status === 'PROCESSING');
            if (processingJob) {
                setSelectedJobId(processingJob.id);
            } else {
                setSelectedJobId(syncJobs[0].id);
            }
        }
    }, [syncJobs, selectedJobId, isNewJobMode]);

    // 폴링을 통한 진행 상태 업데이트
    useEffect(() => {
        if (!selectedJobId || selectedJob?.status !== 'PROCESSING') return;

        const pollInterval = setInterval(async () => {
            const { data, error } = await supabase.from('sync_jobs').select('*').eq('id', selectedJobId).single();

            if (!error && data) {
                // 쿼리 캐시 업데이트
                queryClient.setQueryData(['sync-jobs', selectedUnionId], (old: SyncJob[] | undefined) => {
                    if (!old) return old;
                    return old.map((job) => (job.id === selectedJobId ? data : job));
                });

                if (data.status === 'COMPLETED') {
                    toast.success('모든 필지 데이터 수집이 완료되었습니다.');
                    clearInterval(pollInterval);
                } else if (data.status === 'FAILED') {
                    toast.error('데이터 수집 중 오류가 발생했습니다.');
                    clearInterval(pollInterval);
                }
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [selectedJobId, selectedJob?.status, selectedUnionId, queryClient]);

    // 지도 미리보기용 GeoJSON 조회 (RPC 함수 사용 - geometry를 GeoJSON으로 변환)
    const { data: mapData, isLoading: isLoadingMap } = useQuery({
        queryKey: ['gis-map-preview', selectedUnionId, selectedJobId],
        queryFn: async () => {
            if (!selectedUnionId) return null;

            // RPC 함수를 사용하여 GeoJSON 데이터 조회 (PostGIS geometry를 JSON으로 변환)
            const { data: parcels, error } = await supabase.rpc('get_union_parcels_geojson', {
                p_union_id: selectedUnionId,
            });

            if (error) {
                console.error('RPC get_union_parcels_geojson error:', error);
                throw error;
            }

            // 필지 데이터 맵 생성 (PNU -> 상세정보)
            const parcelMap = new Map<string, RpcParcelData>();
            (parcels || []).forEach((p: RpcParcelData) => {
                parcelMap.set(p.pnu, p);
            });

            // GeoJSON FeatureCollection 생성
            const features = (parcels || [])
                .filter((p: RpcParcelData) => p.boundary_geojson !== null)
                .map((p: RpcParcelData) => ({
                    type: 'Feature' as const,
                    properties: {
                        name: p.pnu,
                        address: p.address,
                    },
                    geometry: p.boundary_geojson as GeoJSON.Geometry,
                }));

            const geoJson: GeoJSON.FeatureCollection = {
                type: 'FeatureCollection',
                features,
            };

            // EChartsMap용 데이터 생성 (추가 필드 포함)
            const mapDataArray: ParcelData[] = (parcels || [])
                .filter((p: RpcParcelData) => p.boundary_geojson !== null)
                .map((p: RpcParcelData) => ({
                    pnu: p.pnu,
                    address: p.address,
                    area: p.area ?? undefined,
                    officialPrice: p.official_price ?? undefined,
                    ownerCount: p.owner_count ?? undefined,
                    status: 'NONE_AGREED' as const,
                }));

            // 통계 데이터
            const stats = {
                totalLots: parcels?.length || 0,
                withBoundary: features.length,
                withoutBoundary: (parcels?.length || 0) - features.length,
            };

            return { geoJson, mapDataArray, parcelMap, stats };
        },
        enabled: !!selectedUnionId && !!selectedJobId && !isNewJobMode,
    });

    // 실패 주소 목록 파싱
    const failedAddresses = useMemo<FailedAddress[]>(() => {
        if (!selectedJob?.error_log) return [];

        try {
            const errorData = JSON.parse(selectedJob.error_log);
            return errorData.failedAddresses || [];
        } catch {
            return [];
        }
    }, [selectedJob?.error_log]);

    // 실패 주소를 콤마로 구분된 문자열로 변환
    const failedAddressesString = useMemo(() => {
        return failedAddresses.map((f) => f.address).join(', ');
    }, [failedAddresses]);

    // 클립보드 복사
    const handleCopyFailedAddresses = async () => {
        if (!failedAddressesString) return;

        try {
            await navigator.clipboard.writeText(failedAddressesString);
            toast.success('실패 주소가 클립보드에 복사되었습니다.');
        } catch {
            toast.error('복사에 실패했습니다.');
        }
    };

    // 수동 주소 검색
    const handleManualSearch = async () => {
        if (!manualSearchAddress.trim()) {
            toast.error('주소를 입력해주세요.');
            return;
        }

        setIsSearching(true);
        setSearchResult(null);
        setSearchError(null);

        try {
            const result = await searchAddress(manualSearchAddress.trim(), manualSearchSource);

            if (result.success && result.data) {
                setSearchResult(result.data);
                toast.success('검색 결과를 찾았습니다.');
            } else {
                setSearchError(result.message || result.error || '검색 결과가 없습니다.');
            }
        } catch (error) {
            console.error('Manual search error:', error);
            setSearchError('검색 중 오류가 발생했습니다.');
        } finally {
            setIsSearching(false);
        }
    };

    // 수동 주소 추가
    const handleManualAdd = async () => {
        if (!selectedUnionId) {
            toast.error('조합을 먼저 선택해주세요.');
            return;
        }

        if (!searchResult) {
            toast.error('먼저 주소를 검색해주세요.');
            return;
        }

        setIsAdding(true);

        try {
            const result = await addAddressToUnion(selectedUnionId, searchResult.address, searchResult.pnu);

            if (result.success && result.data) {
                toast.success(
                    `주소가 추가되었습니다. (공시지가: ${formatPrice(result.data.officialPrice)}, 소유주: ${
                        result.data.ownerCount
                    }명)`
                );
                // 검색 결과 초기화
                setSearchResult(null);
                setManualSearchAddress('');
                // 지도 데이터 새로고침
                queryClient.invalidateQueries({ queryKey: ['gis-map-preview', selectedUnionId] });
            } else {
                toast.error(result.error || '주소 추가에 실패했습니다.');
            }
        } catch (error) {
            console.error('Manual add error:', error);
            toast.error('주소 추가 중 오류가 발생했습니다.');
        } finally {
            setIsAdding(false);
        }
    };

    // 필지 클릭 핸들러
    const handleParcelClick = useCallback(
        (pnu: string) => {
            if (!mapData?.parcelMap) return;

            const parcel = mapData.parcelMap.get(pnu);
            if (parcel) {
                setSelectedParcel({
                    pnu: parcel.pnu,
                    address: parcel.address,
                    area: parcel.area ?? undefined,
                    officialPrice: parcel.official_price ?? undefined,
                    ownerCount: parcel.owner_count ?? undefined,
                    status: 'NONE_AGREED',
                });
            }
        },
        [mapData?.parcelMap]
    );

    // 조합 변경 시 상태 초기화
    const handleUnionChange = useCallback((unionId: string) => {
        setSelectedUnionId(unionId);
        setSelectedJobId(null);
        setIsNewJobMode(false);
        setPreviewData([]);
        setAllAddresses([]);
        setSelectedParcel(null);
    }, []);

    // 템플릿 다운로드
    const handleDownloadTemplate = () => {
        const template = [['주소(전체)'], ['서울특별시 강북구 미아동 791-2882'], ['서울특별시 강북구 미아동 산 1-1']];
        const ws = XLSX.utils.aoa_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '지번업로드양식');
        XLSX.writeFile(wb, 'gis_upload_template.xlsx');
    };

    // 파일 업로드
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

            // 헤더 제외한 전체 데이터
            const allRows = jsonData.slice(1);
            const addresses = allRows
                .map((row) => row[0])
                .filter((addr): addr is string => typeof addr === 'string' && addr.trim() !== '');

            setAllAddresses(addresses);
            setPreviewData(allRows.slice(0, 10));

            toast.success(`${file.name} 분석 완료 (총 ${addresses.length}건)`);
        } catch (error) {
            console.error('File Analysis Error:', error);
            toast.error('파일 분석 중 오류가 발생했습니다.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // 수집 시작
    const startSync = async () => {
        if (allAddresses.length === 0) {
            toast.error('먼저 엑셀 파일을 업로드해 주세요.');
            return;
        }

        if (!selectedUnionId) {
            toast.error('대상 조합을 선택해 주세요.');
            return;
        }

        try {
            const result = await startGisSync({
                unionId: selectedUnionId,
                addresses: allAddresses,
            });

            if (!result.success) {
                throw new Error(result.error || 'GIS sync failed');
            }

            // 새 작업 모드 종료 및 작업 선택
            setIsNewJobMode(false);
            setSelectedJobId(result.jobId || null);
            setPreviewData([]);
            setAllAddresses([]);

            // 작업 목록 새로고침
            await refetchJobs();

            toast.success(`데이터 수집을 시작합니다. (총 ${allAddresses.length}건)`);
        } catch (error) {
            console.error('Sync Start Error:', error);
            const errorMessage = error instanceof Error ? error.message : '수집 시작 중 오류가 발생했습니다.';
            toast.error(errorMessage);
        }
    };

    // 배포
    const handlePublish = async () => {
        if (!selectedJobId) return;

        try {
            const { error } = await supabase.from('sync_jobs').update({ is_published: true }).eq('id', selectedJobId);

            if (error) throw error;

            await refetchJobs();
            toast.success('지도가 성공적으로 배포되었습니다.');
        } catch (error) {
            console.error('Publish Error:', error);
            toast.error('배포 처리 중 오류가 발생했습니다.');
        }
    };

    // 삭제
    const handleDelete = async () => {
        if (!jobToDelete) return;

        try {
            // 작업 삭제 (연관된 union_land_lots는 유지)
            const { error } = await supabase.from('sync_jobs').delete().eq('id', jobToDelete);

            if (error) throw error;

            if (selectedJobId === jobToDelete) {
                setSelectedJobId(null);
            }

            await refetchJobs();
            toast.success('작업 기록이 삭제되었습니다.');
        } catch (error) {
            console.error('Delete Error:', error);
            toast.error('삭제 중 오류가 발생했습니다.');
        } finally {
            setDeleteDialogOpen(false);
            setJobToDelete(null);
        }
    };

    // 작업 상태 포맷
    const formatJobStatus = (job: SyncJob) => {
        switch (job.status) {
            case 'PROCESSING':
                return { label: '진행중', color: 'text-blue-600', bg: 'bg-blue-50' };
            case 'COMPLETED':
                return { label: '완료', color: 'text-green-600', bg: 'bg-green-50' };
            case 'FAILED':
                return { label: '실패', color: 'text-red-600', bg: 'bg-red-50' };
            default:
                return { label: '알 수 없음', color: 'text-gray-600', bg: 'bg-gray-50' };
        }
    };

    // 날짜 포맷
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="p-6 space-y-6 max-w-full mx-auto">
            {/* 헤더 */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
                        GIS SYNC CONTROL PANEL
                    </h1>
                    <p className="text-slate-500 mt-1">지번 데이터 수집 및 GIS 시각화 배포 관리 시스템</p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    className="hover:bg-slate-50 border-slate-200"
                >
                    <Download className="mr-2 h-4 w-4" /> 템플릿 다운로드
                </Button>
            </div>

            {/* 조합 선택 */}
            <Card className="shadow-sm border-slate-200">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-bold text-slate-700 whitespace-nowrap">대상 조합</label>
                        <SelectBox
                            value={selectedUnionId}
                            onChange={handleUnionChange}
                            options={unionOptions}
                            placeholder="조합을 선택해 주세요"
                            disabled={isLoadingUnions}
                        />
                        {selectedUnionId && (
                            <Button variant="outline" size="sm" onClick={() => refetchJobs()} className="ml-auto">
                                <RefreshCw className="w-4 h-4 mr-1" />
                                새로고침
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {selectedUnionId && (
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* 좌측: 작업 기록 목록 */}
                    <Card className="shadow-sm border-slate-200 lg:col-span-1">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-md flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    작업 기록
                                </CardTitle>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setIsNewJobMode(true);
                                        setSelectedJobId(null);
                                        setSelectedParcel(null);
                                    }}
                                    className="bg-[#4E8C6D] hover:bg-[#3d7058]"
                                >
                                    <Plus className="w-4 h-4 mr-1" />새 작업
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                            {isLoadingJobs ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                </div>
                            ) : syncJobs && syncJobs.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {syncJobs.map((job) => {
                                        const statusInfo = formatJobStatus(job);
                                        const isSelected = job.id === selectedJobId && !isNewJobMode;

                                        return (
                                            <div
                                                key={job.id}
                                                onClick={() => {
                                                    setSelectedJobId(job.id);
                                                    setIsNewJobMode(false);
                                                    setSelectedParcel(null);
                                                }}
                                                className={cn(
                                                    'p-4 cursor-pointer transition-all hover:bg-slate-50',
                                                    isSelected && 'bg-blue-50 border-l-4 border-l-blue-500'
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={cn(
                                                                'text-xs font-medium px-2 py-0.5 rounded',
                                                                statusInfo.bg,
                                                                statusInfo.color
                                                            )}
                                                        >
                                                            {statusInfo.label}
                                                        </span>
                                                        {job.is_published && (
                                                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-700">
                                                                배포됨
                                                            </span>
                                                        )}
                                                    </div>
                                                    <ChevronRight
                                                        className={cn(
                                                            'w-4 h-4 text-slate-400',
                                                            isSelected && 'text-blue-500'
                                                        )}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-500 mt-2">
                                                    {formatDate(job.created_at)}
                                                </p>
                                                {job.status === 'PROCESSING' && (
                                                    <div className="mt-2">
                                                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 animate-pulse transition-all"
                                                                style={{ width: `${job.progress}%` }}
                                                            />
                                                        </div>
                                                        <p className="text-xs text-blue-600 mt-1">{job.progress}%</p>
                                                    </div>
                                                )}
                                                {job.preview_data && (
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        성공: {job.preview_data.successCount || 0} / 실패:{' '}
                                                        {job.preview_data.failedCount || 0}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">작업 기록이 없습니다.</p>
                                    <p className="text-xs mt-1">새 작업을 시작해 주세요.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 우측: 지도 미리보기 또는 새 작업 */}
                    <Card className="shadow-sm border-slate-200 lg:col-span-2">
                        {isNewJobMode ? (
                            // 새 작업 모드
                            <>
                                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Upload className="w-5 h-5" />새 작업 - 주소 목록 업로드
                                    </CardTitle>
                                    <CardDescription>
                                        수집할 지번 목록을 업로드하여 GIS 데이터를 수집합니다.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    <div
                                        className={cn(
                                            'border-2 border-dashed rounded-xl p-8 text-center transition-all',
                                            previewData.length > 0
                                                ? 'border-[#4E8C6D]/30 bg-[#4E8C6D]/5'
                                                : 'border-slate-200 bg-slate-50/50'
                                        )}
                                    >
                                        <Upload
                                            className={cn(
                                                'mx-auto h-10 w-10 mb-4',
                                                previewData.length > 0 ? 'text-[#4E8C6D]' : 'text-slate-400'
                                            )}
                                        />
                                        <div className="flex flex-col items-center">
                                            <label className="cursor-pointer bg-slate-900 text-white px-6 py-2.5 rounded-lg hover:bg-slate-800 transition shadow-sm font-medium flex items-center gap-2">
                                                {isAnalyzing ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <TableIcon className="w-4 h-4" />
                                                )}
                                                엑셀 파일 선택
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept=".xlsx,.xls"
                                                    onChange={handleFileUpload}
                                                />
                                            </label>
                                            <p className="mt-2 text-xs text-slate-400">
                                                지원 형식: XLSX, XLS (최대 50MB)
                                            </p>
                                        </div>
                                    </div>

                                    {previewData.length > 0 && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                                    <Eye className="w-4 h-4" /> 미리보기 (상위 10건 / 총{' '}
                                                    {allAddresses.length}건)
                                                </h3>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setPreviewData([]);
                                                        setAllAddresses([]);
                                                    }}
                                                    className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    초기화
                                                </Button>
                                            </div>
                                            <div className="rounded-lg border border-slate-200 overflow-hidden text-xs max-h-[200px] overflow-y-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-slate-100/50 text-slate-600 sticky top-0">
                                                        <tr>
                                                            <th className="px-4 py-2 border-b">주소</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {previewData.map((row, idx) => (
                                                            <tr key={idx} className="bg-white">
                                                                <td className="px-4 py-2 truncate">{row[0]}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <Button
                                                onClick={startSync}
                                                className="w-full bg-[#4E8C6D] hover:bg-[#3d7058] h-12 text-md font-bold shadow-lg shadow-[#4E8C6D]/10"
                                            >
                                                <Play className="mr-2 h-5 w-5 fill-current" /> 수집 태스크 시작
                                            </Button>
                                        </div>
                                    )}

                                    <Button variant="outline" onClick={() => setIsNewJobMode(false)} className="w-full">
                                        취소
                                    </Button>
                                </CardContent>
                            </>
                        ) : selectedJob ? (
                            // 작업 상세 보기
                            <>
                                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <MapPin className="w-5 h-5" />
                                                지도 미리보기
                                            </CardTitle>
                                            <CardDescription>{formatDate(selectedJob.created_at)} 작업</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {selectedJob.status === 'PROCESSING' && (
                                                <div className="flex items-center gap-2 text-blue-600">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span className="text-sm font-medium">{selectedJob.progress}%</span>
                                                </div>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setJobToDelete(selectedJob.id);
                                                    setDeleteDialogOpen(true);
                                                }}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {/* 지도 영역 */}
                                    <div className="h-[400px] bg-slate-100 relative">
                                        {isLoadingMap ? (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                                            </div>
                                        ) : mapData?.geoJson && mapData.geoJson.features.length > 0 ? (
                                            <EChartsMap
                                                geoJson={mapData.geoJson}
                                                data={mapData.mapDataArray}
                                                mode="preview"
                                                onParcelClick={handleParcelClick}
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                                <MapPin className="w-12 h-12 mb-2 opacity-50" />
                                                <p className="text-sm font-medium">지도 데이터가 없습니다.</p>
                                                <p className="text-xs mt-1">
                                                    필지 경계(boundary) 데이터가 수집되지 않았습니다.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 선택된 필지 상세 정보 */}
                                    {selectedParcel && (
                                        <div className="p-4 border-t border-slate-200 bg-blue-50/50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-3 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-blue-600" />
                                                        <span className="font-semibold text-slate-900">
                                                            {selectedParcel.address || '주소 정보 없음'}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Ruler className="w-4 h-4 text-slate-400" />
                                                            <span className="text-slate-500">면적:</span>
                                                            <span className="font-medium text-slate-700">
                                                                {formatArea(selectedParcel.area)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Banknote className="w-4 h-4 text-slate-400" />
                                                            <span className="text-slate-500">공시지가:</span>
                                                            <span className="font-medium text-slate-700">
                                                                {formatPrice(selectedParcel.officialPrice)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Users className="w-4 h-4 text-slate-400" />
                                                            <span className="text-slate-500">소유주:</span>
                                                            <span className="font-medium text-slate-700">
                                                                {selectedParcel.ownerCount ?? 0}명
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedParcel(null)}
                                                    className="text-slate-400 hover:text-slate-600"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 통계 및 액션 */}
                                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm">
                                                        <strong>{mapData?.stats?.totalLots || 0}</strong> 필지
                                                    </span>
                                                </div>
                                                {selectedJob.preview_data && (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                            <span className="text-sm text-green-600">
                                                                성공 {selectedJob.preview_data.successCount || 0}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                                            <span className="text-sm text-red-600">
                                                                실패 {selectedJob.preview_data.failedCount || 0}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {selectedJob.status === 'COMPLETED' && !selectedJob.is_published && (
                                                    <Button
                                                        onClick={handlePublish}
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        <Send className="w-4 h-4 mr-2" />
                                                        배포하기
                                                    </Button>
                                                )}
                                                {selectedJob.is_published && (
                                                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span className="text-sm font-medium">배포 완료</span>
                                                    </div>
                                                )}
                                                {selectedJob.status === 'FAILED' && (
                                                    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                                                        <AlertCircle className="w-4 h-4" />
                                                        <span className="text-sm font-medium">수집 실패</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 실패 주소 목록 표시 */}
                                        {failedAddresses.length > 0 && (
                                            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs text-red-600 font-medium">
                                                        실패 주소 ({failedAddresses.length}건)
                                                    </p>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleCopyFailedAddresses}
                                                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-100 h-7 px-2"
                                                    >
                                                        <Copy className="w-3 h-3 mr-1" />
                                                        복사
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-red-500 max-h-[80px] overflow-y-auto leading-relaxed">
                                                    {failedAddressesString}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </>
                        ) : (
                            // 작업 선택 안됨
                            <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
                                <Eye className="w-12 h-12 mb-4 opacity-50" />
                                <p className="text-lg font-medium">작업을 선택해 주세요</p>
                                <p className="text-sm mt-1">좌측에서 작업을 선택하거나 새 작업을 시작하세요.</p>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* 수동 주소 검색 영역 */}
            {selectedUnionId && (
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
                        <CardTitle className="text-md flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            주소 수동 검색
                        </CardTitle>
                        <CardDescription>
                            Vworld 또는 공공데이터포털에서 주소를 검색하고 직접 추가합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {/* 검색 폼 */}
                        <div className="flex flex-wrap items-center gap-3">
                            <SelectBox
                                value={manualSearchSource}
                                onChange={(value) => setManualSearchSource(value as 'vworld' | 'data_portal')}
                                options={[
                                    { value: 'vworld', label: 'Vworld' },
                                    { value: 'data_portal', label: '공공데이터포털' },
                                ]}
                                placeholder="데이터 소스"
                                className="w-[160px]"
                            />
                            <Input
                                type="text"
                                placeholder="주소 입력 (예: 서울시 강북구 미아동 123-45)"
                                value={manualSearchAddress}
                                onChange={(e) => setManualSearchAddress(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleManualSearch();
                                    }
                                }}
                                className="flex-1 min-w-[300px]"
                            />
                            <Button
                                onClick={handleManualSearch}
                                disabled={isSearching || !manualSearchAddress.trim()}
                                className="bg-slate-900 hover:bg-slate-800"
                            >
                                {isSearching ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <MapPin className="w-4 h-4 mr-2" />
                                )}
                                조회
                            </Button>
                        </div>

                        {/* 검색 결과 */}
                        {searchError && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-2 text-red-600">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm font-medium">결과 없음</span>
                                </div>
                                <p className="text-sm text-red-500 mt-1">{searchError}</p>
                            </div>
                        )}

                        {searchResult && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-sm font-medium">결과 있음</span>
                                    </div>
                                    <Button
                                        onClick={handleManualAdd}
                                        disabled={isAdding}
                                        size="sm"
                                        className="bg-[#4E8C6D] hover:bg-[#3d7058]"
                                    >
                                        {isAdding ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Plus className="w-4 h-4 mr-2" />
                                        )}
                                        추가
                                    </Button>
                                </div>
                                <div className="mt-3 space-y-1">
                                    <p className="text-sm">
                                        <span className="text-slate-500">주소:</span>{' '}
                                        <span className="font-medium text-slate-900">{searchResult.address}</span>
                                    </p>
                                    <p className="text-sm">
                                        <span className="text-slate-500">PNU:</span>{' '}
                                        <span className="font-mono text-slate-900">{searchResult.pnu}</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 삭제 확인 다이얼로그 */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>작업 기록 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 작업 기록을 삭제하시겠습니까?
                            <br />
                            수집된 필지 데이터(union_land_lots)는 유지됩니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
