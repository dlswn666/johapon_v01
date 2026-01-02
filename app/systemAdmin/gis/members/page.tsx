'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
    Download,
    Upload,
    Search,
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Building2,
    Users,
    Edit,
    Loader2,
    Clock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import {
    MemberExcelRow,
    MatchingResult,
    matchMembersWithGis,
    savePreRegisteredMembers,
    getPreRegisteredMembers,
    deletePreRegisteredMember,
    manualMatchUser,
} from '@/app/_lib/features/gis/actions/memberMatching';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { normalizeDong, normalizeHo } from '@/app/_lib/shared/utils/dong-ho-utils';

interface Union {
    id: string;
    name: string;
    slug: string;
}

interface PreRegisteredMember {
    id: string;
    name: string;
    phone_number: string | null;
    property_pnu: string | null;
    property_address_jibun: string | null;
    property_dong: string | null;
    property_ho: string | null;
    resident_address: string | null;
    created_at: string;
}

export default function MemberManagementPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const unionIdParam = searchParams.get('unionId');

    // 상태
    const [unions, setUnions] = useState<Union[]>([]);
    const [selectedUnionId, setSelectedUnionId] = useState<string>(unionIdParam || '');
    const [isLoadingUnions, setIsLoadingUnions] = useState(true);

    // 엑셀 업로드 관련
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedData, setUploadedData] = useState<MemberExcelRow[]>([]);
    const [matchingResults, setMatchingResults] = useState<MatchingResult[]>([]);
    const [isMatching, setIsMatching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<{
        success: boolean;
        savedCount: number;
        errors: string[];
    } | null>(null);
    
    // 비동기 처리 관련
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const ASYNC_THRESHOLD = 50; // 50건 이상이면 비동기 처리
    
    // 비동기 작업 상태 조회
    const { data: jobStatus } = useQuery({
        queryKey: ['pre-register-job-status', currentJobId],
        queryFn: async () => {
            if (!currentJobId) throw new Error('Job ID is required');
            const response = await fetch(`/api/member-invite/job/${currentJobId}`);
            if (!response.ok) throw new Error('Job status fetch failed');
            const result = await response.json();
            return result.data;
        },
        enabled: !!currentJobId,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'completed' || status === 'failed') return false;
            return 2000;
        },
    });
    
    // 작업 완료 시 처리
    useEffect(() => {
        if (jobStatus?.status === 'completed') {
            const result = jobStatus.result;
            setSaveResult({
                success: true,
                savedCount: result?.savedCount || 0,
                errors: result?.errors || [],
            });
            setCurrentJobId(null);
            setUploadedData([]);
            setMatchingResults([]);
            fetchMembers();
        } else if (jobStatus?.status === 'failed') {
            setSaveResult({
                success: false,
                savedCount: 0,
                errors: [jobStatus.error || '저장 처리 중 오류가 발생했습니다.'],
            });
            setCurrentJobId(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobStatus?.status]);

    // 기존 조합원 목록
    const [preRegisteredMembers, setPreRegisteredMembers] = useState<PreRegisteredMember[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // 수동 매칭 모달
    const [manualMatchModal, setManualMatchModal] = useState<{
        open: boolean;
        member: PreRegisteredMember | null;
        newAddress: string;
        dong: string;
        ho: string;
    }>({
        open: false,
        member: null,
        newAddress: '',
        dong: '',
        ho: '',
    });
    const [isManualMatching, setIsManualMatching] = useState(false);

    // 삭제 확인 다이얼로그
    const [deleteConfirm, setDeleteConfirm] = useState<{
        open: boolean;
        member: PreRegisteredMember | null;
    }>({
        open: false,
        member: null,
    });

    // 조합 목록 조회
    useEffect(() => {
        const fetchUnions = async () => {
            const { data, error } = await supabase
                .from('unions')
                .select('id, name, slug')
                .order('name');

            if (!error && data) {
                setUnions(data);
                if (!selectedUnionId && data.length > 0) {
                    setSelectedUnionId(data[0].id);
                }
            }
            setIsLoadingUnions(false);
        };

        fetchUnions();
    }, [selectedUnionId]);

    // 조합 선택 시 URL 업데이트 및 조합원 목록 조회
    useEffect(() => {
        if (selectedUnionId) {
            const url = new URL(window.location.href);
            url.searchParams.set('unionId', selectedUnionId);
            router.replace(url.pathname + url.search, { scroll: false });
            fetchMembers();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUnionId]);

    // 조합원 목록 조회
    const fetchMembers = useCallback(async () => {
        if (!selectedUnionId) return;

        setIsLoadingMembers(true);
        const result = await getPreRegisteredMembers(selectedUnionId);
        if (result.success && result.data) {
            setPreRegisteredMembers(result.data);
        }
        setIsLoadingMembers(false);
    }, [selectedUnionId]);

    // 엑셀 템플릿 다운로드
    const handleDownloadTemplate = () => {
        const templateData = [
            {
                소유주명: '홍길동',
                거주주소: '서울시 강남구 테헤란로 123',
                '소유지 지번': '서울시 강남구 역삼동 123-4',
                동: '101',
                호수: '1001',
            },
            {
                소유주명: '',
                거주주소: '',
                '소유지 지번': '',
                동: '',
                호수: '',
            },
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);

        // 컬럼 너비 설정
        worksheet['!cols'] = [
            { wch: 15 }, // 소유주명
            { wch: 40 }, // 거주주소
            { wch: 40 }, // 소유지 지번
            { wch: 10 }, // 동
            { wch: 10 }, // 호수
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '조합원 템플릿');
        XLSX.writeFile(workbook, '조합원_업로드_템플릿.xlsx');
    };

    // 엑셀 파일 업로드 처리
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setMatchingResults([]);
        setSaveResult(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

            const members: MemberExcelRow[] = jsonData.map((row) => ({
                name: String(row['소유주명'] || '').trim(),
                phoneNumber: row['핸드폰번호'] ? String(row['핸드폰번호']).trim() : undefined,
                residentAddress: row['거주주소'] ? String(row['거주주소']).trim() : undefined,
                propertyAddress: String(row['소유지 지번'] || '').trim(),
                // 동호수 정규화 적용: 접미사 제거 및 지하층 표시 통일
                dong: row['동'] ? normalizeDong(String(row['동'])) ?? undefined : undefined,
                ho: row['호수'] ? normalizeHo(String(row['호수'])) ?? undefined : undefined,
            })).filter((m) => m.name && m.propertyAddress); // 필수 필드가 있는 것만

            setUploadedData(members);
        } catch (error) {
            console.error('Excel parsing error:', error);
            alert('엑셀 파일 읽기에 실패했습니다.');
        } finally {
            setIsUploading(false);
            event.target.value = ''; // 파일 입력 초기화
        }
    };

    // GIS 매칭 실행
    const handleMatch = async () => {
        if (!selectedUnionId || uploadedData.length === 0) return;

        setIsMatching(true);
        try {
            const results = await matchMembersWithGis(selectedUnionId, uploadedData);
            setMatchingResults(results);
        } catch (error) {
            console.error('Matching error:', error);
            alert('매칭 중 오류가 발생했습니다.');
        } finally {
            setIsMatching(false);
        }
    };

    // 저장 실행
    const handleSave = async () => {
        if (!selectedUnionId || matchingResults.length === 0) return;

        setIsSaving(true);
        setSaveResult(null);
        
        try {
            // 대량 데이터는 비동기 처리
            if (matchingResults.length >= ASYNC_THRESHOLD) {
                const response = await fetch('/api/member-invite/pre-register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        unionId: selectedUnionId,
                        members: matchingResults,
                    }),
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '비동기 저장 요청에 실패했습니다.');
                }
                
                const result = await response.json();
                setCurrentJobId(result.jobId);
                // 비동기 처리 시작됨 - UI는 jobStatus로 업데이트됨
            } else {
                // 소량 데이터는 기존 동기 처리
                const result = await savePreRegisteredMembers(selectedUnionId, matchingResults);
                setSaveResult({
                    success: result.success,
                    savedCount: result.savedCount,
                    errors: result.errors,
                });

                if (result.savedCount > 0) {
                    await fetchMembers();
                    setUploadedData([]);
                    setMatchingResults([]);
                }
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    // 수동 매칭 모달 열기
    const openManualMatchModal = (member: PreRegisteredMember) => {
        setManualMatchModal({
            open: true,
            member,
            newAddress: member.property_address_jibun || '',
            dong: member.property_dong || '',
            ho: member.property_ho || '',
        });
    };

    // 수동 매칭 실행
    const handleManualMatch = async () => {
        if (!manualMatchModal.member || !selectedUnionId) return;

        setIsManualMatching(true);
        try {
            // 동호수 정규화 적용
            const normalizedDong = normalizeDong(manualMatchModal.dong);
            const normalizedHo = normalizeHo(manualMatchModal.ho);

            const result = await manualMatchUser(
                manualMatchModal.member.id,
                selectedUnionId,
                manualMatchModal.newAddress,
                normalizedDong ?? undefined,
                normalizedHo ?? undefined
            );

            if (result.success) {
                alert('매칭이 완료되었습니다.');
                setManualMatchModal({ open: false, member: null, newAddress: '', dong: '', ho: '' });
                await fetchMembers();
            } else {
                alert(`매칭 실패: ${result.error}`);
            }
        } catch (error) {
            console.error('Manual match error:', error);
            alert('수동 매칭 중 오류가 발생했습니다.');
        } finally {
            setIsManualMatching(false);
        }
    };

    // 삭제 실행
    const handleDelete = async () => {
        if (!deleteConfirm.member) return;

        try {
            const result = await deletePreRegisteredMember(deleteConfirm.member.id);
            if (result.success) {
                await fetchMembers();
            } else {
                alert(`삭제 실패: ${result.error}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('삭제 중 오류가 발생했습니다.');
        } finally {
            setDeleteConfirm({ open: false, member: null });
        }
    };

    // 필터링된 조합원 목록
    const filteredMembers = preRegisteredMembers.filter((member) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            member.name.toLowerCase().includes(term) ||
            member.phone_number?.toLowerCase().includes(term) ||
            member.property_address_jibun?.toLowerCase().includes(term)
        );
    });

    const matchedCount = matchingResults.filter((r) => r.matched).length;
    const unmatchedCount = matchingResults.filter((r) => !r.matched).length;

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="w-7 h-7" />
                        조합원 관리
                    </h1>
                    <p className="text-slate-400 mt-1">
                        조합원 데이터를 사전 등록하고 GIS 데이터와 매칭합니다.
                    </p>
                </div>
            </div>

            {/* 조합 선택 */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        조합 선택
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Select
                        value={selectedUnionId}
                        onValueChange={setSelectedUnionId}
                        disabled={isLoadingUnions}
                    >
                        <SelectTrigger className="w-full max-w-md bg-slate-700 border-slate-600 text-white">
                            <SelectValue placeholder="조합을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                            {unions.map((union) => (
                                <SelectItem key={union.id} value={union.id}>
                                    {union.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {selectedUnionId && (
                <>
                    {/* 엑셀 업로드 섹션 */}
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Upload className="w-5 h-5" />
                                조합원 일괄 등록
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                엑셀 파일을 업로드하여 조합원을 사전 등록합니다. GIS 데이터와 자동 매칭됩니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-4">
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadTemplate}
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    템플릿 다운로드
                                </Button>

                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={isUploading}
                                    />
                                    <Button
                                        className="bg-blue-600 hover:bg-blue-700"
                                        disabled={isUploading}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        {isUploading ? '업로드 중...' : '엑셀 업로드'}
                                    </Button>
                                </div>
                            </div>

                            {/* 업로드된 데이터 미리보기 */}
                            {uploadedData.length > 0 && (
                                <div className="mt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-slate-300">
                                            업로드된 데이터: {uploadedData.length}건
                                        </p>
                                        <Button
                                            onClick={handleMatch}
                                            disabled={isMatching}
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            <Search className="w-4 h-4 mr-2" />
                                            {isMatching ? 'GIS 매칭 중...' : 'GIS 매칭 시작'}
                                        </Button>
                                    </div>

                                    {/* 매칭 결과 */}
                                    {matchingResults.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    매칭됨: {matchedCount}건
                                                </Badge>
                                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                                    비매칭: {unmatchedCount}건
                                                </Badge>
                                            </div>

                                            <div className="max-h-64 overflow-auto rounded-lg border border-slate-700">
                                                <Table>
                                                    <TableHeader className="bg-slate-900/50 sticky top-0">
                                                        <TableRow className="border-slate-700 hover:bg-transparent">
                                                            <TableHead className="text-slate-400">상태</TableHead>
                                                            <TableHead className="text-slate-400">소유주명</TableHead>
                                                            <TableHead className="text-slate-400">소유지 지번</TableHead>
                                                            <TableHead className="text-slate-400">동/호수</TableHead>
                                                            <TableHead className="text-slate-400">매칭된 PNU</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {matchingResults.map((result, idx) => (
                                                            <TableRow key={idx} className="border-slate-700">
                                                                <TableCell>
                                                                    {result.matched ? (
                                                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                                                    ) : (
                                                                        <XCircle className="w-5 h-5 text-amber-400" />
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-white">{result.row.name}</TableCell>
                                                                <TableCell className="text-slate-300">{result.row.propertyAddress}</TableCell>
                                                                <TableCell className="text-slate-300">
                                                                    {result.row.dong && result.row.ho
                                                                        ? `${result.row.dong}동 ${result.row.ho}호`
                                                                        : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-slate-300 font-mono text-xs">
                                                                    {result.pnu || '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <Button
                                                    onClick={handleSave}
                                                    disabled={isSaving || !!currentJobId}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    {isSaving ? (
                                                        <>
                                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                            저장 중...
                                                        </>
                                                    ) : (
                                                        '사전 등록 저장'
                                                    )}
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setUploadedData([]);
                                                        setMatchingResults([]);
                                                        setSaveResult(null);
                                                        setCurrentJobId(null);
                                                    }}
                                                    disabled={!!currentJobId && jobStatus?.status === 'processing'}
                                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                                >
                                                    초기화
                                                </Button>
                                                
                                                {matchingResults.length >= ASYNC_THRESHOLD && (
                                                    <span className="text-xs text-amber-400">
                                                        * {ASYNC_THRESHOLD}건 이상은 백그라운드에서 처리됩니다
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* 비동기 처리 진행률 표시 */}
                                            {currentJobId && jobStatus && (
                                                <div className="mt-4 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            {jobStatus.status === 'processing' && (
                                                                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                                            )}
                                                            {jobStatus.status === 'pending' && (
                                                                <Clock className="w-4 h-4 text-yellow-400" />
                                                            )}
                                                            <span className="text-sm font-medium text-blue-300">
                                                                {jobStatus.status === 'pending' && '대기 중...'}
                                                                {jobStatus.status === 'processing' && '사전 등록 처리 중...'}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-blue-300">
                                                            {jobStatus.progress}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-blue-900 rounded-full h-2">
                                                        <div 
                                                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${jobStatus.progress}%` }}
                                                        />
                                                    </div>
                                                    <p className="mt-2 text-xs text-blue-400">
                                                        총 {jobStatus.totalCount}명 중 {jobStatus.processedCount || 0}명 처리됨
                                                    </p>
                                                </div>
                                            )}

                                            {/* 저장 결과 */}
                                            {saveResult && (
                                                <div
                                                    className={`p-4 rounded-lg ${
                                                        saveResult.success
                                                            ? 'bg-emerald-500/20 border border-emerald-500/30'
                                                            : 'bg-amber-500/20 border border-amber-500/30'
                                                    }`}
                                                >
                                                    <p className={saveResult.success ? 'text-emerald-400' : 'text-amber-400'}>
                                                        {saveResult.savedCount}건이 저장되었습니다.
                                                    </p>
                                                    {saveResult.errors.length > 0 && (
                                                        <ul className="mt-2 text-sm text-amber-300 list-disc list-inside">
                                                            {saveResult.errors.map((err, idx) => (
                                                                <li key={idx}>{err}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 기존 조합원 목록 */}
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        사전 등록 조합원 목록
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        총 {preRegisteredMembers.length}명
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchMembers}
                                    disabled={isLoadingMembers}
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingMembers ? 'animate-spin' : ''}`} />
                                    새로고침
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="이름, 전화번호, 주소로 검색..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            <div className="max-h-96 overflow-auto rounded-lg border border-slate-700">
                                <Table>
                                    <TableHeader className="bg-slate-900/50 sticky top-0">
                                        <TableRow className="border-slate-700 hover:bg-transparent">
                                            <TableHead className="text-slate-400">매칭</TableHead>
                                            <TableHead className="text-slate-400">소유주명</TableHead>
                                            <TableHead className="text-slate-400">전화번호</TableHead>
                                            <TableHead className="text-slate-400">소유지 지번</TableHead>
                                            <TableHead className="text-slate-400">동/호수</TableHead>
                                            <TableHead className="text-slate-400">PNU</TableHead>
                                            <TableHead className="text-slate-400">등록일</TableHead>
                                            <TableHead className="text-slate-400">작업</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingMembers ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                                                    로딩 중...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredMembers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                                                    {searchTerm ? '검색 결과가 없습니다.' : '사전 등록된 조합원이 없습니다.'}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredMembers.map((member) => (
                                                <TableRow key={member.id} className="border-slate-700">
                                                    <TableCell>
                                                        {member.property_pnu ? (
                                                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-amber-400" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-white font-medium">{member.name}</TableCell>
                                                    <TableCell className="text-slate-300">
                                                        {member.phone_number || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-slate-300 max-w-xs truncate">
                                                        {member.property_address_jibun || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-slate-300">
                                                        {member.property_dong && member.property_ho
                                                            ? `${member.property_dong}동 ${member.property_ho}호`
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-slate-400 font-mono text-xs">
                                                        {member.property_pnu ? member.property_pnu.substring(0, 19) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-slate-400 text-sm">
                                                        {new Date(member.created_at).toLocaleDateString('ko-KR')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openManualMatchModal(member)}
                                                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                                                                title="수동 매칭"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setDeleteConfirm({ open: true, member })}
                                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                                                title="삭제"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* 수동 매칭 모달 */}
            <Dialog
                open={manualMatchModal.open}
                onOpenChange={(open) => !open && setManualMatchModal({ open: false, member: null, newAddress: '', dong: '', ho: '' })}
            >
                <DialogContent className="bg-slate-800 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white">수동 매칭</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {manualMatchModal.member?.name}님의 소유지 주소를 수정하여 GIS 데이터와 매칭합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label className="text-slate-300">소유지 지번 주소</Label>
                            <Input
                                value={manualMatchModal.newAddress}
                                onChange={(e) => setManualMatchModal((prev) => ({ ...prev, newAddress: e.target.value }))}
                                placeholder="예: 서울시 강남구 역삼동 123-4"
                                className="mt-1 bg-slate-700 border-slate-600 text-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-slate-300">동</Label>
                                <Input
                                    value={manualMatchModal.dong}
                                    onChange={(e) => setManualMatchModal((prev) => ({ ...prev, dong: e.target.value }))}
                                    placeholder="예: 101"
                                    className="mt-1 bg-slate-700 border-slate-600 text-white"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-300">호수</Label>
                                <Input
                                    value={manualMatchModal.ho}
                                    onChange={(e) => setManualMatchModal((prev) => ({ ...prev, ho: e.target.value }))}
                                    placeholder="예: 1001"
                                    className="mt-1 bg-slate-700 border-slate-600 text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setManualMatchModal({ open: false, member: null, newAddress: '', dong: '', ho: '' })}
                            className="border-slate-600 text-slate-300"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleManualMatch}
                            disabled={isManualMatching || !manualMatchModal.newAddress}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isManualMatching ? '매칭 중...' : '매칭 실행'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 삭제 확인 다이얼로그 */}
            <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, member: null })}>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">조합원 삭제</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            {deleteConfirm.member?.name}님의 사전 등록 정보를 삭제하시겠습니까?
                            <br />
                            이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
