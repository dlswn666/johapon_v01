'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    Search,
    Download,
    Upload,
    FileSpreadsheet,
    Users,
    X,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SelectBox } from '@/app/_lib/widgets/common/select-box';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useQueryClient } from '@tanstack/react-query';
import {
    useConsentStages,
    useSyncJobStatus,
    searchMembersForConsent,
    MemberSearchResult,
} from '@/app/_lib/features/consent-stages/api/useConsentStages';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
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
import { formatPropertyAddressDisplay } from '@/app/_lib/shared/utils/address-utils';

export default function ConsentManagementTab() {
    const { union } = useSlug();
    const unionId = union?.id;
    const queryClient = useQueryClient();

    // 조회 상태
    const [selectedStageId, setSelectedStageId] = useState<string>('');
    const [searchAddress, setSearchAddress] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchBuilding, setSearchBuilding] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [isResultFocused, setIsResultFocused] = useState(false);
    const [lastFocusedInput, setLastFocusedInput] = useState<'address' | 'name' | 'building'>('name');
    const PAGE_SIZE = 100;

    // 선택된 조합원 리스트 상태
    const [selectedMembers, setSelectedMembers] = useState<MemberSearchResult[]>([]);
    const [consentStatus, setConsentStatus] = useState<'AGREED' | 'DISAGREED'>('AGREED');

    // 확인 모달 상태
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // 검색 결과 리스트 ref + 무한 스크롤 처리
    const searchResultsRef = useRef<HTMLDivElement>(null);
    const searchAddressInputRef = useRef<HTMLInputElement>(null);
    const searchNameInputRef = useRef<HTMLInputElement>(null);
    const searchBuildingInputRef = useRef<HTMLInputElement>(null);
    const searchResultsTableRef = useRef<HTMLTableElement>(null);

    // 파일 input ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    // 비동기 작업 상태
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);

    // 동의 단계 목록 조회 (Hook 사용)
    const { data: stages } = useConsentStages(union?.business_type ?? undefined);

    // 첫 번째 단계 자동 선택
    useEffect(() => {
        if (stages && stages.length > 0 && !selectedStageId) {
            setSelectedStageId(stages[0].id);
        }
    }, [stages, selectedStageId]);

    // 작업 상태 조회 (Hook 사용)
    const { data: jobStatus } = useSyncJobStatus(currentJobId);

    // 작업 완료 시 처리
    useEffect(() => {
        if (jobStatus?.status === 'COMPLETED') {
            const result = jobStatus.preview_data;
            toast.success(`동의 처리 완료!\n성공: ${result?.successCount || 0}건\n실패: ${result?.failCount || 0}건`, {
                duration: 5000,
            });
            setCurrentJobId(null);
            setSelectedMembers([]);
            queryClient.invalidateQueries({ queryKey: ['approved-members'] });
        } else if (jobStatus?.status === 'FAILED') {
            toast.error(jobStatus.error_log || '동의 처리 중 오류가 발생했습니다.');
            setCurrentJobId(null);
        }
    }, [jobStatus, queryClient]);

    // 현재 선택된 단계 정보
    const currentStage = useMemo(() => {
        return stages?.find((s) => s.id === selectedStageId);
    }, [stages, selectedStageId]);

    // 조합원 검색 (Hook 함수 사용)
    const handleSearch = useCallback(async () => {
        if (!unionId || !selectedStageId) {
            toast.error('동의 단계를 선택해주세요.');
            return;
        }

        setIsSearching(true);
        setFocusedIndex(-1);

        try {
            const results = await searchMembersForConsent({
                unionId,
                stageId: selectedStageId,
                searchAddress: searchAddress || undefined,
                searchName: searchName || undefined,
                searchBuilding: searchBuilding || undefined,
                offset: 0,
                limit: PAGE_SIZE,
            });

            if (results.length === 0) {
                setSearchResults([]);
                setHasMore(false);
                if (searchBuilding) {
                    toast.error('해당 건물이름으로 검색된 조합원이 없습니다.');
                } else {
                    toast.error('검색 결과가 없습니다.');
                }
                return;
            }

            setSearchResults(results);
            setHasMore(results.length >= PAGE_SIZE);

            // 조회 완료 후 첫 번째 미선택 항목으로 포커스 이동
            const firstUnselectedIndex = results.findIndex(
                (member) => !selectedMembers.find((m) => m.id === member.id)
            );
            if (firstUnselectedIndex >= 0) {
                setFocusedIndex(firstUnselectedIndex);
                setIsResultFocused(true);
                setTimeout(() => {
                    searchResultsTableRef.current?.focus();
                }, 0);
            } else {
                setFocusedIndex(-1);
                setIsResultFocused(false);
            }
        } catch (error) {
            console.error('검색 오류:', error);
            toast.error('검색 중 오류가 발생했습니다.');
        } finally {
            setIsSearching(false);
        }
    }, [unionId, selectedStageId, searchAddress, searchName, searchBuilding, selectedMembers]);

    // 추가 데이터 로드 (무한 스크롤)
    const handleLoadMore = useCallback(async () => {
        if (!unionId || !selectedStageId || isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        try {
            const results = await searchMembersForConsent({
                unionId,
                stageId: selectedStageId,
                searchAddress: searchAddress || undefined,
                searchName: searchName || undefined,
                searchBuilding: searchBuilding || undefined,
                offset: searchResults.length,
                limit: PAGE_SIZE,
            });

            if (results.length > 0) {
                setSearchResults((prev) => [...prev, ...results]);
            }
            setHasMore(results.length >= PAGE_SIZE);
        } catch (error) {
            console.error('추가 로드 오류:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [unionId, selectedStageId, searchAddress, searchName, searchBuilding, searchResults.length, isLoadingMore, hasMore]);

    // 검색 결과 스크롤 시 하단 근처에서 추가 로드
    const handleSearchResultsScroll = useCallback(() => {
        const el = searchResultsRef.current;
        if (!el || isLoadingMore || !hasMore) return;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
            handleLoadMore();
        }
    }, [isLoadingMore, hasMore, handleLoadMore]);

    // 첫 번째 미선택 항목 인덱스 찾기
    const findFirstUnselectedIndex = useCallback(
        (results: MemberSearchResult[], startIndex: number = 0): number => {
            for (let i = startIndex; i < results.length; i++) {
                if (!selectedMembers.find((m) => m.id === results[i].id)) {
                    return i;
                }
            }
            return -1;
        },
        [selectedMembers]
    );

    // Input 필드 키보드 이벤트 처리 (검색 전용)
    const handleInputKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        },
        [handleSearch]
    );

    // 마지막 포커스된 input으로 돌아가기
    const focusLastInput = useCallback(() => {
        switch (lastFocusedInput) {
            case 'address':
                searchAddressInputRef.current?.focus();
                break;
            case 'name':
                searchNameInputRef.current?.focus();
                break;
            case 'building':
                searchBuildingInputRef.current?.focus();
                break;
        }
    }, [lastFocusedInput]);

    // 조회 결과 영역 키보드 이벤트 처리 (선택 전용)
    const handleResultKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTableElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
                    const member = searchResults[focusedIndex];
                    // 이미 선택된 항목이 아닌 경우에만 선택
                    if (!selectedMembers.find((m) => m.id === member.id)) {
                        setSelectedMembers((prev) => [member, ...prev]);
                        // 선택 후 다음 미선택 항목으로 포커스 이동
                        const nextIndex = findFirstUnselectedIndex(searchResults, focusedIndex + 1);
                        if (nextIndex >= 0) {
                            setFocusedIndex(nextIndex);
                        } else {
                            // 다음 미선택 항목이 없으면 포커스 제거
                            setFocusedIndex(-1);
                            setIsResultFocused(false);
                        }
                    }
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === 'Escape') {
                // Escape 키로 포커스 해제
                setFocusedIndex(-1);
                setIsResultFocused(false);
                focusLastInput();
            } else if (e.key === 'Tab') {
                // Tab 키로 마지막 검색 input으로 포커스 이동
                e.preventDefault();
                setFocusedIndex(-1);
                setIsResultFocused(false);
                focusLastInput();
            }
        },
        [searchResults, selectedMembers, focusedIndex, findFirstUnselectedIndex, focusLastInput]
    );

    // 조합원 선택
    const handleSelectMember = useCallback(
        (member: MemberSearchResult) => {
            if (!selectedMembers.find((m) => m.id === member.id)) {
                setSelectedMembers((prev) => [member, ...prev]);
            }
        },
        [selectedMembers]
    );

    // 선택 해제
    const handleRemoveMember = useCallback((memberId: string) => {
        setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId));
    }, []);

    // 전체 해제
    const handleClearSelection = useCallback(() => {
        setSelectedMembers([]);
    }, []);

    // 동의 처리 확인
    const handleConfirmConsent = useCallback(async () => {
        if (!selectedStageId || selectedMembers.length === 0) return;

        setIsProcessing(true);

        try {
            // 동의 처리 API 호출 (Queue 처리)
            const response = await fetch('/api/consent/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    unionId,
                    stageId: selectedStageId,
                    memberIds: selectedMembers.map((m) => m.id),
                    status: consentStatus,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '동의 처리 실패');
            }

            if (result.jobId) {
                // 비동기 처리
                setCurrentJobId(result.jobId);
                toast.success(`${selectedMembers.length}명의 동의 처리가 시작되었습니다.`);
            } else {
                // 동기 처리 완료
                toast.success(`${result.successCount}명의 동의 처리가 완료되었습니다.`);
                setSelectedMembers([]);
                queryClient.invalidateQueries({ queryKey: ['approved-members'] });
            }

            setShowConfirmModal(false);
        } catch (error) {
            console.error('동의 처리 오류:', error);
            toast.error(error instanceof Error ? error.message : '동의 처리 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    }, [unionId, selectedStageId, selectedMembers, consentStatus, queryClient]);

    // 엑셀 템플릿 다운로드
    const handleDownloadTemplate = useCallback(() => {
        if (!currentStage) {
            toast.error('동의 단계를 선택해주세요.');
            return;
        }

        // 템플릿 데이터: 건물이름 제거, 동의 상태를 한글로 변경
        const templateData = [
            {
                '동의 단계': currentStage.stage_name,
                이름: '홍길동',
                '소유지 지번': '서울시 강남구 역삼동 123-45',
                동: '101',
                호수: '1001',
                '동의 상태': '동의',
            },
            {
                '동의 단계': currentStage.stage_name,
                이름: '김철수',
                '소유지 지번': '서울시 강남구 역삼동 123-46',
                동: 'B1',
                호수: '101',
                '동의 상태': '비동의',
            },
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '동의 현황');

        // 컬럼 너비 설정 (건물이름 제거)
        worksheet['!cols'] = [
            { wch: 20 }, // 동의 단계
            { wch: 15 }, // 이름
            { wch: 40 }, // 소유지 지번
            { wch: 10 }, // 동
            { wch: 10 }, // 호수
            { wch: 15 }, // 동의 상태
        ];

        // 안내 시트 추가
        const guideData = [
            {
                항목: '동의 단계',
                설명: `현재 조합의 동의 단계입니다. (${stages?.map((s) => s.stage_name).join(', ')})`,
            },
            { 항목: '이름', 설명: '조합원 이름을 입력합니다.' },
            { 항목: '소유지 지번', 설명: '물건지의 지번 주소를 입력합니다.' },
            {
                항목: '동',
                설명:
                    '동 번호를 입력합니다. (선택사항)\n' +
                    '【입력 예시】\n' +
                    '• 일반층: 101, 102, 103동 등\n' +
                    '• 지하층: B1, B2 또는 -1, -2 등\n' +
                    '• 복합형: 101-1, 102-A 등\n' +
                    '• 단일 건물: 비워두거나 본관, A동 등',
            },
            {
                항목: '호수',
                설명:
                    '호수를 입력합니다. (선택사항)\n' +
                    '【입력 예시】\n' +
                    '• 일반호수: 101, 201, 1001 등\n' +
                    '• 지하층: B1-101, B101 등\n' +
                    '• 복합형: 101-1, 101A 등\n' +
                    '• 옥탑: R1, 옥탑 등',
            },
            {
                항목: '동의 상태',
                설명:
                    '동의 또는 비동의를 입력합니다.\n' +
                    '【허용 값】\n' +
                    '• 동의: "동의" 또는 "AGREED"\n' +
                    '• 비동의: "비동의" 또는 "DISAGREED"',
            },
        ];
        const guideSheet = XLSX.utils.json_to_sheet(guideData);
        // 상세 안내를 위해 설명 컬럼 너비 확대
        guideSheet['!cols'] = [{ wch: 15 }, { wch: 80 }];
        XLSX.utils.book_append_sheet(workbook, guideSheet, '입력 안내');

        XLSX.writeFile(workbook, `동의현황_템플릿_${currentStage.stage_name}.xlsx`);
        toast.success('템플릿이 다운로드되었습니다.');
    }, [currentStage, stages]);

    // 엑셀 업로드
    const handleFileUpload = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            if (!unionId || !selectedStageId) {
                toast.error('동의 단계를 선택해주세요.');
                return;
            }

            setIsUploading(true);

            try {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, string>[];

                if (jsonData.length === 0) {
                    toast.error('유효한 데이터가 없습니다.');
                    return;
                }

                // 동의 상태 파싱 헬퍼 함수: 한글/영문 모두 지원
                const parseConsentStatus = (statusStr: string): 'AGREED' | 'DISAGREED' | null => {
                    const normalizedStatus = statusStr?.toString().trim().toUpperCase();
                    // 동의: "동의", "AGREED" 허용
                    if (normalizedStatus === 'AGREED' || normalizedStatus === '동의') {
                        return 'AGREED';
                    }
                    // 비동의: "비동의", "DISAGREED" 허용
                    if (normalizedStatus === 'DISAGREED' || normalizedStatus === '비동의') {
                        return 'DISAGREED';
                    }
                    return null;
                };

                // 데이터 파싱 및 검증 (건물이름 컬럼 제거됨)
                const consentData = jsonData
                    .map((row, index) => {
                        const parsedStatus = parseConsentStatus(row['동의 상태'] || '');
                        return {
                            rowNumber: index + 2,
                            name: row['이름']?.toString().trim() || '',
                            address: row['소유지 지번']?.toString().trim() || '',
                            dong: row['동']?.toString().trim() || '',
                            ho: row['호수']?.toString().trim() || '',
                            status: parsedStatus || '',
                        };
                    })
                    .filter((row) => row.name && (row.status === 'AGREED' || row.status === 'DISAGREED'));

                if (consentData.length === 0) {
                    toast.error('유효한 데이터가 없습니다. 이름과 동의 상태(동의/비동의)를 확인해주세요.');
                    return;
                }

                // API 호출 (Queue 처리)
                const response = await fetch('/api/consent/bulk-upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        unionId,
                        stageId: selectedStageId,
                        data: consentData,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || '업로드 실패');
                }

                if (result.jobId) {
                    setCurrentJobId(result.jobId);
                    toast.success(`${consentData.length}건의 데이터 처리가 시작되었습니다.`);
                } else {
                    toast.success(`${result.successCount}건 처리 완료, ${result.failCount}건 실패`);
                    queryClient.invalidateQueries({ queryKey: ['approved-members'] });
                }
            } catch (error) {
                console.error('엑셀 업로드 오류:', error);
                toast.error(error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.');
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        },
        [unionId, selectedStageId, queryClient]
    );

    // 동의 상태 아이콘
    const getConsentStatusBadge = (status: 'AGREED' | 'DISAGREED' | 'PENDING') => {
        const config = {
            AGREED: { icon: CheckCircle2, label: '동의', className: 'bg-green-100 text-green-700' },
            DISAGREED: { icon: XCircle, label: '미동의', className: 'bg-red-100 text-red-700' },
            PENDING: { icon: Clock, label: '미제출', className: 'bg-gray-100 text-gray-600' },
        };
        const { icon: Icon, label, className } = config[status];
        return (
            <Badge variant="outline" className={cn('text-xs', className)}>
                <Icon className="w-3 h-3 mr-1" />
                {label}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            {/* 엑셀 업로드 섹션 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#4E8C6D]/10 rounded-xl flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5 text-[#4E8C6D]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">동의 현황 일괄 업로드</h2>
                            <p className="text-sm text-gray-600">엑셀 파일로 조합원 동의 현황을 일괄 업로드합니다</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">동의 단계:</span>
                        <SelectBox
                            value={selectedStageId}
                            onChange={(value) => setSelectedStageId(value)}
                            options={stages?.map((s) => ({ value: s.id, label: s.stage_name })) || []}
                            placeholder="동의 단계 선택"
                            className="min-w-[200px]"
                        />
                    </div>

                    <Button
                        variant="outline"
                        onClick={handleDownloadTemplate}
                        disabled={!selectedStageId}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        템플릿 다운로드
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!selectedStageId || isUploading}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        {isUploading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4 mr-2" />
                        )}
                        엑셀 업로드
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </div>

                {/* 비동기 작업 진행률 */}
                {currentJobId && jobStatus && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {jobStatus.status === 'PROCESSING' && (
                                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                )}
                                <span className="text-sm font-medium text-blue-800">
                                    {jobStatus.status === 'PROCESSING' ? '처리 중...' : '대기 중...'}
                                </span>
                            </div>
                            <span className="text-sm font-semibold text-blue-800">{jobStatus.progress}%</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${jobStatus.progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 조회 및 선택 섹션 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#4E8C6D]" />
                        조합원 동의 처리
                    </h2>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 왼쪽: 검색 및 결과 */}
                    <div className="flex flex-col space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700">조회</h3>

                        {/* 검색 폼 */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    ref={searchAddressInputRef}
                                    placeholder="지번 주소"
                                    value={searchAddress}
                                    onChange={(e) => setSearchAddress(e.target.value)}
                                    onKeyDown={handleInputKeyDown}
                                    onFocus={() => setLastFocusedInput('address')}
                                    className="h-11"
                                />
                                <Input
                                    ref={searchNameInputRef}
                                    placeholder="소유주 이름"
                                    value={searchName}
                                    onChange={(e) => setSearchName(e.target.value)}
                                    onKeyDown={handleInputKeyDown}
                                    onFocus={() => setLastFocusedInput('name')}
                                    className="h-11"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Input
                                    ref={searchBuildingInputRef}
                                    placeholder="건물이름"
                                    value={searchBuilding}
                                    onChange={(e) => setSearchBuilding(e.target.value)}
                                    onKeyDown={handleInputKeyDown}
                                    onFocus={() => setLastFocusedInput('building')}
                                    className="flex-1 h-11"
                                />
                                <Button
                                    onClick={handleSearch}
                                    disabled={isSearching || !selectedStageId}
                                    className="bg-[#4E8C6D] hover:bg-[#3d7058] text-white h-11"
                                >
                                    {isSearching ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* 검색 결과 */}
                        <div
                            ref={searchResultsRef}
                            onScroll={handleSearchResultsScroll}
                            className="border border-gray-200 rounded-lg max-h-[450px] min-h-[300px] overflow-y-auto flex-grow overscroll-contain"
                        >
                            {searchResults.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">검색 결과가 없습니다</p>
                                </div>
                            ) : (
                                <>
                                    <table
                                        ref={searchResultsTableRef}
                                        className="w-full text-sm outline-none"
                                        tabIndex={0}
                                        onKeyDown={handleResultKeyDown}
                                        onFocus={() => setIsResultFocused(true)}
                                        onBlur={() => setIsResultFocused(false)}
                                    >
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                                                    번호
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                                                    이름
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                                                    지번
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                                                    동/호
                                                </th>
                                                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">
                                                    상태
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {searchResults.map((member, index) => {
                                                const isSelected = !!selectedMembers.find((m) => m.id === member.id);
                                                const isFocused = focusedIndex === index && isResultFocused;
                                                return (
                                                    <tr
                                                        key={member.id}
                                                        className={cn(
                                                            'cursor-pointer transition-all',
                                                            !isSelected && !isFocused && 'hover:bg-primary/5',
                                                            isSelected && 'bg-green-50 opacity-60 cursor-not-allowed',
                                                            isFocused &&
                                                                !isSelected &&
                                                                'bg-primary/10 ring-2 ring-[#4E8C6D] ring-inset'
                                                        )}
                                                        onClick={() => !isSelected && handleSelectMember(member)}
                                                        onMouseEnter={() => {
                                                            if (!isSelected) {
                                                                setFocusedIndex(index);
                                                            }
                                                        }}
                                                    >
                                                        <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                                                        <td className="px-3 py-2 font-medium text-gray-900">
                                                            {member.name}
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-600 truncate max-w-[200px]" title={formatPropertyAddressDisplay(member.property_address_jibun, member.property_address_road, member.property_dong, member.property_ho) || member.property_address || '-'}>
                                                            {formatPropertyAddressDisplay(member.property_address_jibun, member.property_address_road, member.property_dong, member.property_ho) || member.property_address || '-'}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            {getConsentStatusBadge(member.current_consent_status)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {isLoadingMore && (
                                        <div className="flex items-center justify-center py-3 text-gray-500">
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            <span className="text-xs">추가 로딩 중...</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {searchResults.length > 0 && (
                            <p className="text-xs text-gray-500">
                                검색 결과: {searchResults.length}명{hasMore ? '+' : ''} | 클릭하여 오른쪽 목록에 추가
                            </p>
                        )}
                    </div>

                    {/* 오른쪽: 선택된 조합원 */}
                    <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700">
                                선택된 조합원 ({selectedMembers.length}명)
                            </h3>
                            {selectedMembers.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearSelection}
                                    className="text-gray-500 hover:text-red-500"
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    전체 해제
                                </Button>
                            )}
                        </div>

                        {/* 선택된 조합원 목록 */}
                        <div className="border border-gray-200 rounded-lg max-h-[450px] min-h-[300px] overflow-y-auto flex-grow overscroll-contain">
                            {selectedMembers.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <p className="text-sm">조합원을 선택하세요</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {selectedMembers.map((member, index) => (
                                        <div
                                            key={member.id}
                                            className="p-3 flex items-center justify-between hover:bg-gray-50"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400">{index + 1}</span>
                                                    <span className="font-medium text-gray-900">{member.name}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                    {formatPropertyAddressDisplay(member.property_address_jibun, member.property_address_road, member.property_dong, member.property_ho) || member.property_address || '-'}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="text-gray-400 hover:text-red-500 shrink-0"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 동의 상태 선택 */}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">동의 상태:</span>
                            <SelectBox
                                value={consentStatus}
                                onChange={(value) => setConsentStatus(value as 'AGREED' | 'DISAGREED')}
                                options={[
                                    { value: 'AGREED', label: '✓ 동의' },
                                    { value: 'DISAGREED', label: '✗ 비동의' },
                                ]}
                                className="flex-1"
                            />
                        </div>

                        {/* 확인 버튼 - 동의상태에 따라 텍스트 변경 */}
                        <Button
                            onClick={() => setShowConfirmModal(true)}
                            disabled={selectedMembers.length === 0 || !selectedStageId}
                            className="w-full h-12 bg-[#4E8C6D] hover:bg-[#3d7058] text-white text-base font-medium"
                        >
                            {selectedMembers.length}명 {consentStatus === 'AGREED' ? '동의' : '비동의'} 처리
                        </Button>
                    </div>
                </div>
            </div>

            {/* 확인 모달 */}
            <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <AlertDialogContent className="bg-white max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-gray-900">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            동의 처리 확인
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p className="text-gray-600">해당 조합원을 다음과 같이 처리하시겠습니까?</p>

                                {/* 큰 텍스트로 동의 단계와 상태 표시 */}
                                <div className="p-6 bg-gray-50 rounded-xl space-y-4 text-center">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">동의 단계</p>
                                        <p className="text-2xl font-bold text-[#4E8C6D]">
                                            {currentStage?.stage_name || '-'}
                                        </p>
                                    </div>
                                    <div className="border-t border-gray-200 pt-4">
                                        <p className="text-sm text-gray-500 mb-1">동의 상태</p>
                                        <p
                                            className={cn(
                                                'text-3xl font-bold',
                                                consentStatus === 'AGREED' ? 'text-green-600' : 'text-red-600'
                                            )}
                                        >
                                            {consentStatus === 'AGREED' ? '✓ 동의' : '✗ 비동의'}
                                        </p>
                                    </div>
                                </div>

                                <p className="text-center text-gray-700 font-medium">
                                    총 <span className="text-[#4E8C6D] font-bold">{selectedMembers.length}명</span>의
                                    조합원
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            disabled={isProcessing}
                        >
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmConsent();
                            }}
                            disabled={isProcessing}
                            className="bg-[#4E8C6D] hover:bg-[#3d7058] text-white"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    처리 중...
                                </>
                            ) : (
                                '확인'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
