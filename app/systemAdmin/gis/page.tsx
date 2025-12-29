'use client';

import { useState, useEffect } from 'react';
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
    Building2,
    Users,
    FileSearch,
    RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/app/_lib/shared/supabase/client';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { SelectBox } from '@/app/_lib/widgets/common/select-box';
import { useUnions } from '@/app/_lib/features/union-management/api/useUnionManagementHook';
import { useQuery } from '@tanstack/react-query';
import { startGisSync } from '@/app/_lib/features/gis/actions/syncGis';

export default function GisSyncPage() {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'idle' | 'syncing' | 'completed' | 'failed'>('idle');
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [isPublished, setIsPublished] = useState(false);
    const [selectedUnionId, setSelectedUnionId] = useState<string>('');

    // 조합 목록 조회
    const { data: unions, isLoading: isLoadingUnions } = useUnions();
    const unionOptions = unions?.map(u => ({ value: u.id, label: u.name })) || [];
    
    // 미리보기 데이터 상태
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [previewData, setPreviewData] = useState<any[]>([]);
    // 전체 주소 목록 (API 전송용)
    const [allAddresses, setAllAddresses] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // 수집 완료 데이터 검증용 상태
    const [showValidation, _setShowValidation] = useState(false);

    // 수집 완료된 데이터 통계 조회
    const { data: collectedStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
        queryKey: ['gis-collected-stats', selectedUnionId, currentJobId],
        queryFn: async () => {
            if (!selectedUnionId) return null;

            // 필지 수 조회
            const { count: landLotCount } = await supabase
                .from('union_land_lots')
                .select('*', { count: 'exact', head: true })
                .eq('union_id', selectedUnionId);

            // 건물 호수 수 조회 (land_lots 테이블과 조인)
            const { data: landLots } = await supabase
                .from('union_land_lots')
                .select('pnu')
                .eq('union_id', selectedUnionId);

            const pnus = landLots?.map(l => l.pnu) || [];

            let buildingUnitCount = 0;
            let ownerCount = 0;

            if (pnus.length > 0) {
                const { count: unitCount } = await supabase
                    .from('building_units')
                    .select('*', { count: 'exact', head: true })
                    .in('pnu', pnus);

                buildingUnitCount = unitCount || 0;

                // 소유주 수 조회
                const { data: units } = await supabase
                    .from('building_units')
                    .select('id')
                    .in('pnu', pnus);

                if (units && units.length > 0) {
                    const unitIds = units.map(u => u.id);
                    const { count: ownCount } = await supabase
                        .from('owners')
                        .select('*', { count: 'exact', head: true })
                        .in('unit_id', unitIds);
                    ownerCount = ownCount || 0;
                }
            }

            // 샘플 데이터 조회 (상위 5개 필지)
            const { data: sampleLots } = await supabase
                .from('union_land_lots')
                .select('pnu, address_text, land_area')
                .eq('union_id', selectedUnionId)
                .limit(5);

            return {
                landLotCount: landLotCount || 0,
                buildingUnitCount,
                ownerCount,
                sampleLots: sampleLots || []
            };
        },
        enabled: !!selectedUnionId && (status === 'completed' || showValidation),
        staleTime: 10000, // 10초 캐시
    });

    // Supabase Realtime을 통한 작업 상태 구독
    useEffect(() => {
        if (!currentJobId) return;

        const channel = supabase
            .channel(`sync_jobs_${currentJobId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'sync_jobs',
                filter: `id=eq.${currentJobId}`
            }, (payload) => {
                const newProgress = payload.new.progress;
                const newStatus = payload.new.status;
                const published = payload.new.is_published;
                
                setProgress(newProgress);
                setIsPublished(published);
                
                if (newStatus === 'COMPLETED') {
                    setStatus('completed');
                    toast.success('모든 필지 데이터 수집이 완료되었습니다.');
                } else if (newStatus === 'FAILED') {
                    setStatus('failed');
                    toast.error('데이터 수집 중 오류가 발생했습니다.');
                } else if (newStatus === 'PROCESSING') {
                    setStatus('syncing');
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentJobId]);

    const handleDownloadTemplate = () => {
        const template = [
            ['주소(전체)'],
            ['서울특별시 강북구 미아동 791-2882'],
            ['서울특별시 강북구 미아동 산 1-1'],
        ];
        const ws = XLSX.utils.aoa_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '지번업로드양식');
        XLSX.writeFile(wb, 'gis_upload_template.xlsx');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsAnalyzing(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            // 헤더 제외한 전체 데이터 (첫 번째 컬럼 = 주소)
            const allRows = jsonData.slice(1);
            const addresses = allRows
                .map(row => row[0])
                .filter((addr): addr is string => typeof addr === 'string' && addr.trim() !== '');
            
            // 전체 주소 목록 저장 (API 전송용)
            setAllAddresses(addresses);
            
            // 상위 10개만 미리보기로 저장
            const previewRows = allRows.slice(0, 10);
            setPreviewData(previewRows);
            
            toast.success(`${file.name} 데이터 분석 완료 (총 ${addresses.length}건)`);
        } catch (error) {
            console.error('File Analysis Error:', error);
            toast.error('파일 분석 중 오류가 발생했습니다.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const startSync = async () => {
        if (allAddresses.length === 0) {
            toast.error('먼저 엑셀 파일을 업로드해 주세요.');
            return;
        }

        if (!selectedUnionId) {
            toast.error('대상 조합을 선택해 주세요.');
            return;
        }

        setStatus('syncing');
        setProgress(0);
        
        try {
            // 서버 액션을 통해 GIS 수집 API 호출
            const result = await startGisSync({
                unionId: selectedUnionId,
                addresses: allAddresses
            });

            if (!result.success) {
                throw new Error(result.error || 'GIS sync failed');
            }
            
            // 반환된 jobId로 Realtime 구독 설정
            setCurrentJobId(result.jobId || null);
            toast.success(`데이터 수집을 시작합니다. (총 ${allAddresses.length}건)`);
        } catch (error) {
            console.error('Sync Start Error:', error);
            const errorMessage = error instanceof Error ? error.message : '수집 시작 중 오류가 발생했습니다.';
            toast.error(errorMessage);
            setStatus('idle');
        }
    };

    const handlePublish = async () => {
        if (!currentJobId) return;

        try {
            const { error } = await supabase
                .from('sync_jobs')
                .update({ is_published: true })
                .eq('id', currentJobId);

            if (error) throw error;
            setIsPublished(true);
            toast.success('지도가 성공적으로 배포되었습니다. 이제 관리자가 확인할 수 있습니다.');
        } catch (error) {
            console.error('Publish Error:', error);
            toast.error('배포 처리 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 font-mono tracking-tight">GIS SYNC CONTROL PANEL</h1>
                    <p className="text-slate-500 mt-1">지번 데이터 수집 및 GIS 시각화 배포 관리 시스템</p>
                </div>
                <Button variant="outline" onClick={handleDownloadTemplate} className="hover:bg-slate-50 border-slate-200">
                    <Download className="mr-2 h-4 w-4" /> 템플릿 다운로드
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* 1단계: 업로드 및 분석 */}
                <Card className="md:col-span-2 shadow-sm border-slate-200">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                        <div className="flex items-center gap-2">
                            <div className="size-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">1</div>
                            <div>
                                <CardTitle className="text-lg">주소 목록 업로드 및 분석</CardTitle>
                                <CardDescription>수집할 지번 목록을 업로드하여 미리보기를 확인합니다.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">대상 조합 선택</label>
                                <SelectBox
                                    value={selectedUnionId}
                                    onChange={setSelectedUnionId}
                                    options={unionOptions}
                                    placeholder="조합을 선택해 주세요"
                                    disabled={isLoadingUnions || status === 'syncing'}
                                />
                            </div>

                            <div className={cn(
                                "border-2 border-dashed rounded-xl p-8 text-center transition-all",
                                previewData.length > 0 ? "border-[#4E8C6D]/30 bg-[#4E8C6D]/5" : "border-slate-200 bg-slate-50/50"
                            )}>
                                <Upload className={cn("mx-auto h-10 w-10 mb-4", previewData.length > 0 ? "text-[#4E8C6D]" : "text-slate-400")} />
                                <div className="flex flex-col items-center">
                                    <label className="cursor-pointer bg-slate-900 text-white px-6 py-2.5 rounded-lg hover:bg-slate-800 transition shadow-sm font-medium flex items-center gap-2">
                                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TableIcon className="w-4 h-4" />}
                                        엑셀 파일 선택
                                        <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                                    </label>
                                    <p className="mt-2 text-xs text-slate-400">지원 형식: XLSX, XLS (최대 50MB)</p>
                                </div>
                            </div>
                        </div>

                        {previewData.length > 0 && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                        <Eye className="w-4 h-4" /> 데이터 미리보기 (상위 10건 / 총 {allAddresses.length}건)
                                    </h3>
                                    <Button variant="ghost" size="sm" onClick={() => { setPreviewData([]); setAllAddresses([]); }} className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50">초기화</Button>
                                </div>
                                <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-100/50 text-slate-600">
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
                                <Button onClick={startSync} disabled={status === 'syncing'} className="w-full bg-[#4E8C6D] hover:bg-[#3d7058] h-12 text-md font-bold shadow-lg shadow-[#4E8C6D]/10">
                                    <Play className="mr-2 h-5 w-5 fill-current" /> 수집 태스크 시작
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2~3단계: 현황 및 배포 */}
                <div className="space-y-6">
                    <Card className="shadow-sm border-slate-200 overflow-hidden">
                        <CardHeader className="bg-slate-50/30 border-b border-slate-50 py-4">
                            <div className="flex items-center gap-2">
                                <div className="size-6 rounded-full bg-slate-400 text-white flex items-center justify-center text-xs font-bold">2</div>
                                <CardTitle className="text-md">수집 진행 현황</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-bold text-slate-700">
                                    <span>Sync Progress</span>
                                    <span className="font-mono">{progress}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                    <div 
                                        className={cn(
                                            "h-full transition-all duration-500",
                                            status === 'syncing' ? "bg-blue-500 animate-pulse" : status === 'completed' ? "bg-green-500" : "bg-slate-300"
                                        )}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                {status === 'idle' && <Play className="text-slate-300 h-5 w-5" />}
                                {status === 'syncing' && <Loader2 className="animate-spin text-blue-500 h-5 w-5" />}
                                {status === 'completed' && <CheckCircle2 className="text-green-500 h-5 w-5" />}
                                {status === 'failed' && <AlertCircle className="text-red-500 h-5 w-5" />}
                                
                                <span className="font-bold text-slate-700">
                                    {status === 'idle' && '작업 대기 중'}
                                    {status === 'syncing' && '실시간 엔진 동작 중...'}
                                    {status === 'completed' && '데이터 수집 완료'}
                                    {status === 'failed' && '수집 중단됨'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3단계: 데이터 검증 */}
                    <Card className={cn(
                        "shadow-sm border-slate-200 overflow-hidden transition-all",
                        status === 'completed' ? "opacity-100" : "opacity-50 grayscale pointer-events-none"
                    )}>
                        <CardHeader className="bg-slate-50/30 border-b border-slate-50 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="size-6 rounded-full bg-slate-400 text-white flex items-center justify-center text-xs font-bold">3</div>
                                    <CardTitle className="text-md">수집 데이터 검증</CardTitle>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => refetchStats()}
                                    disabled={isLoadingStats}
                                    className="h-7 px-2"
                                >
                                    <RefreshCw className={cn("w-3 h-3", isLoadingStats && "animate-spin")} />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {isLoadingStats ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                </div>
                            ) : collectedStats ? (
                                <>
                                    {/* 통계 카드 */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                                            <MapPin className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                                            <p className="text-lg font-bold text-blue-700">{collectedStats.landLotCount}</p>
                                            <p className="text-xs text-blue-500">필지</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-3 text-center">
                                            <Building2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
                                            <p className="text-lg font-bold text-green-700">{collectedStats.buildingUnitCount}</p>
                                            <p className="text-xs text-green-500">호수</p>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-3 text-center">
                                            <Users className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                                            <p className="text-lg font-bold text-purple-700">{collectedStats.ownerCount}</p>
                                            <p className="text-xs text-purple-500">소유주</p>
                                        </div>
                                    </div>

                                    {/* 샘플 데이터 미리보기 */}
                                    {collectedStats.sampleLots.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-1 mb-2">
                                                <FileSearch className="w-3 h-3 text-slate-400" />
                                                <span className="text-xs font-semibold text-slate-500">샘플 데이터 (상위 5건)</span>
                                            </div>
                                            <div className="rounded-lg border border-slate-200 overflow-hidden">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="px-2 py-1.5 text-left text-slate-600">주소</th>
                                                            <th className="px-2 py-1.5 text-right text-slate-600">면적</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {collectedStats.sampleLots.map((lot, idx) => (
                                                            <tr key={idx} className="bg-white">
                                                                <td className="px-2 py-1.5 truncate max-w-[180px]" title={lot.address_text || lot.pnu}>
                                                                    {lot.address_text || lot.pnu}
                                                                </td>
                                                                <td className="px-2 py-1.5 text-right text-slate-500">
                                                                    {lot.land_area ? `${Number(lot.land_area).toLocaleString()}㎡` : '-'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* 검증 결과 */}
                                    <div className={cn(
                                        "p-3 rounded-lg border",
                                        collectedStats.landLotCount > 0 
                                            ? "bg-green-50 border-green-200" 
                                            : "bg-yellow-50 border-yellow-200"
                                    )}>
                                        {collectedStats.landLotCount > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                <span className="text-xs text-green-700 font-medium">
                                                    데이터 수집이 정상적으로 완료되었습니다.
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-yellow-500" />
                                                <span className="text-xs text-yellow-700 font-medium">
                                                    수집된 데이터가 없습니다. 주소 목록을 확인해 주세요.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4 text-slate-400 text-sm">
                                    조합을 선택하고 수집을 완료하면<br/>
                                    데이터 검증이 가능합니다.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 4단계: 최종 배포 승인 */}
                    <Card className={cn(
                        "shadow-sm border-slate-200 overflow-hidden transition-all",
                        status === 'completed' && collectedStats && collectedStats.landLotCount > 0 
                            ? "opacity-100" 
                            : "opacity-50 grayscale pointer-events-none"
                    )}>
                        <CardHeader className="bg-slate-50/30 border-b border-slate-50 py-4">
                            <div className="flex items-center gap-2">
                                <div className="size-6 rounded-full bg-slate-400 text-white flex items-center justify-center text-xs font-bold">4</div>
                                <CardTitle className="text-md">최종 배포 승인</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <p className="text-xs text-slate-500 leading-relaxed">
                                데이터 검증이 완료되었습니까? 배포 승인을 누르면 조합 관리자 페이지의 지도가 활성화됩니다.
                            </p>
                            <Button 
                                onClick={handlePublish} 
                                disabled={isPublished}
                                className={cn(
                                    "w-full h-11 font-bold",
                                    isPublished ? "bg-slate-100 text-slate-400" : "bg-blue-600 hover:bg-blue-700 text-white"
                                )}
                            >
                                {isPublished ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                                {isPublished ? '배포 완료됨' : '조합 지도 배포 승인'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
