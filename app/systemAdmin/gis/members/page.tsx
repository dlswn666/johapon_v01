'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    getPreRegisteredMembers,
    deletePreRegisteredMember,
    deleteAllPreRegisteredMembers,
    updateUnmatchedMember,
} from '@/app/_lib/features/gis/actions/memberMatching';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { normalizeDong, normalizeHo } from '@/app/_lib/shared/utils/dong-ho-utils';
import { DataTable, ColumnDef } from '@/app/_lib/widgets/common/data-table';

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

// 조합원 테이블 컬럼 정의
const memberColumns: ColumnDef<PreRegisteredMember>[] = [
    {
        key: 'property_pnu',
        header: '매칭',
        align: 'center',
        width: '70px',
        render: (value) =>
            value ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
            ) : (
                <XCircle className="w-5 h-5 text-amber-400 mx-auto" />
            ),
    },
    {
        key: 'name',
        header: '소유주명',
        className: 'text-white font-medium',
        align: 'center',
        width: '120px',
    },
    {
        key: 'phone_number',
        header: '전화번호',
        className: 'text-slate-300',
        align: 'center',
        width: '140px',
        render: (value) => (value as string) || '-',
    },
    {
        key: 'property_address_jibun',
        header: '소유지 지번',
        className: 'text-slate-300',
        align: 'center',
        wrap: true,
        minWidth: '280px',
        render: (value) => (value as string) || '-',
    },
    {
        key: 'dong_ho',
        header: '동/호수',
        className: 'text-slate-300',
        align: 'center',
        width: '100px',
        accessor: (row) => (row.property_dong && row.property_ho ? `${row.property_dong}동 ${row.property_ho}호` : '-'),
    },
    {
        key: 'pnu_display',
        header: 'PNU',
        className: 'text-slate-400 font-mono text-xs',
        align: 'center',
        width: '170px',
        accessor: (row) => (row.property_pnu ? row.property_pnu.substring(0, 19) : '-'),
    },
    {
        key: 'created_at',
        header: '등록일',
        className: 'text-slate-400 text-sm',
        align: 'center',
        width: '100px',
        render: (value) => new Date(value as string).toLocaleDateString('ko-KR'),
    },
];

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
    const [uploadedCount, setUploadedCount] = useState(0);
    const [saveResult, setSaveResult] = useState<{
        success: boolean;
        savedCount: number;
        updatedCount: number;
        matchedCount: number;
        unmatchedCount: number;
        duplicateCount: number;
        errors: string[];
    } | null>(null);

    // 비동기 처리 관련
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);

    // GIS 동기화 관련
    const [syncJobId, setSyncJobId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{
        success: boolean;
        totalCount: number;
        syncedCount: number;
        skippedCount: number;
        failedCount: number;
        errors: string[];
    } | null>(null);

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
            const status = query.state.data?.status?.toLowerCase();
            if (status === 'completed' || status === 'failed') return false;
            return 2000;
        },
    });

    // 작업 완료 시 처리
    useEffect(() => {
        const status = jobStatus?.status?.toLowerCase();
        if (status === 'completed') {
            const result = jobStatus.result;
            setSaveResult({
                success: true,
                savedCount: result?.savedCount || 0,
                updatedCount: result?.updatedCount || 0,
                matchedCount: result?.matchedCount || 0,
                unmatchedCount: result?.unmatchedCount || 0,
                duplicateCount: result?.duplicateCount || 0,
                errors: result?.errors || [],
            });
            setCurrentJobId(null);
            setUploadedCount(0);
            fetchMembers();
        } else if (status === 'failed') {
            setSaveResult({
                success: false,
                savedCount: 0,
                updatedCount: 0,
                matchedCount: 0,
                unmatchedCount: 0,
                duplicateCount: 0,
                errors: [jobStatus?.error || '처리 중 오류가 발생했습니다.'],
            });
            setCurrentJobId(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobStatus?.status]);

    // GIS 동기화 작업 상태 조회
    const { data: syncJobStatus } = useQuery({
        queryKey: ['sync-properties-job-status', syncJobId],
        queryFn: async () => {
            if (!syncJobId) throw new Error('Job ID is required');
            const response = await fetch(`/api/member-invite/job/${syncJobId}`);
            if (!response.ok) throw new Error('Job status fetch failed');
            const result = await response.json();
            return result.data;
        },
        enabled: !!syncJobId,
        refetchInterval: (query) => {
            const status = query.state.data?.status?.toLowerCase();
            if (status === 'completed' || status === 'failed') return false;
            return 2000;
        },
    });

    // GIS 동기화 작업 완료 시 처리
    useEffect(() => {
        const status = syncJobStatus?.status?.toLowerCase();
        if (status === 'completed') {
            const result = syncJobStatus.result;
            setSyncResult({
                success: true,
                totalCount: result?.totalCount || 0,
                syncedCount: result?.syncedCount || 0,
                skippedCount: result?.skippedCount || 0,
                failedCount: result?.failedCount || 0,
                errors: result?.errors || [],
            });
            setSyncJobId(null);
            setIsSyncing(false);
            fetchMembers();
        } else if (status === 'failed') {
            setSyncResult({
                success: false,
                totalCount: 0,
                syncedCount: 0,
                skippedCount: 0,
                failedCount: 0,
                errors: [syncJobStatus?.error || 'GIS 동기화 중 오류가 발생했습니다.'],
            });
            setSyncJobId(null);
            setIsSyncing(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncJobStatus?.status]);

    // 조합 선택 변경 시 상태 초기화
    const resetUploadState = useCallback(() => {
        setUploadedCount(0);
        setCurrentJobId(null);
        setSaveResult(null);
        setSyncJobId(null);
        setSyncResult(null);
        setIsSyncing(false);
    }, []);

    // 진행 중인 작업 조회 및 복구
    const checkExistingJob = useCallback(
        async (unionId: string) => {
            try {
                // PRE_REGISTER 작업 조회
                const { data: preRegisterJobs } = await supabase
                    .from('sync_jobs')
                    .select('id, status, progress, preview_data')
                    .eq('union_id', unionId)
                    .eq('status', 'PROCESSING')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (preRegisterJobs && preRegisterJobs.length > 0) {
                    const job = preRegisterJobs[0];
                    if (job.preview_data?.job_type === 'PRE_REGISTER') {
                        setCurrentJobId(job.id);
                        return; // PRE_REGISTER 작업 발견 시 종료
                    } else if (job.preview_data?.job_type === 'SYNC_PROPERTIES') {
                        setSyncJobId(job.id);
                        setIsSyncing(true);
                        return; // SYNC_PROPERTIES 작업 발견 시 종료
                    }
                }

                // 진행 중인 작업이 없으면 상태 초기화
                resetUploadState();
            } catch (error) {
                console.error('진행 중인 작업 조회 실패:', error);
                resetUploadState();
            }
        },
        [resetUploadState]
    );

    // 기존 조합원 목록
    const [preRegisteredMembers, setPreRegisteredMembers] = useState<PreRegisteredMember[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [inputValue, setInputValue] = useState(''); // 입력 필드용 (즉시 반영)
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // 검색용 (debounce 후 반영)
    const [matchFilter, setMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');

    // 무한 스크롤 관련 상태
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalMemberCount, setTotalMemberCount] = useState(0);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const ITEMS_PER_PAGE = 30;

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

    // 전체 초기화 확인 다이얼로그
    const [resetConfirm, setResetConfirm] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    // 조합 목록 조회
    useEffect(() => {
        const fetchUnions = async () => {
            const { data, error } = await supabase.from('unions').select('id, name, slug').order('name');

            if (!error && data) {
                setUnions(data);
                // 디폴트 선택 제거 - 사용자가 직접 선택하도록 함
            }
            setIsLoadingUnions(false);
        };

        fetchUnions();
    }, [selectedUnionId]);

    // 조합 선택 시 URL 업데이트 및 조합원 목록 조회 + 진행 중인 작업 확인
    useEffect(() => {
        if (selectedUnionId) {
            const url = new URL(window.location.href);
            url.searchParams.set('unionId', selectedUnionId);
            router.replace(url.pathname + url.search, { scroll: false });
            fetchMembers();
            checkExistingJob(selectedUnionId); // 진행 중인 작업 확인 및 복구
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUnionId]);

    // inputValue 변경 시 1초 후 debouncedSearchTerm 업데이트
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(inputValue);
        }, 1000);

        return () => clearTimeout(timer);
    }, [inputValue]);

    // debouncedSearchTerm 또는 매칭 필터 변경 시 조합원 목록 재조회
    useEffect(() => {
        if (selectedUnionId) {
            fetchMembers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchTerm, matchFilter]);

    // 조합원 목록 조회 (초기 로드)
    const fetchMembers = useCallback(async () => {
        if (!selectedUnionId) return;

        setIsLoadingMembers(true);
        setPreRegisteredMembers([]);
        setHasMore(true);

        const result = await getPreRegisteredMembers(selectedUnionId, {
            offset: 0,
            limit: ITEMS_PER_PAGE,
            searchTerm: debouncedSearchTerm || undefined,
            matchFilter: matchFilter,
        });
        if (result.success && result.data) {
            setPreRegisteredMembers(result.data);
            setTotalMemberCount(result.totalCount || 0);
            setHasMore(result.hasMore || false);
        }
        setIsLoadingMembers(false);
    }, [selectedUnionId, debouncedSearchTerm, matchFilter]);

    // 추가 조합원 로드 (무한 스크롤)
    const loadMoreMembers = useCallback(async () => {
        if (!selectedUnionId || isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        const currentOffset = preRegisteredMembers.length;

        const result = await getPreRegisteredMembers(selectedUnionId, {
            offset: currentOffset,
            limit: ITEMS_PER_PAGE,
            searchTerm: debouncedSearchTerm || undefined,
            matchFilter: matchFilter,
        });

        if (result.success && result.data) {
            setPreRegisteredMembers((prev) => [...prev, ...result.data!]);
            setHasMore(result.hasMore || false);
        }
        setIsLoadingMore(false);
    }, [selectedUnionId, isLoadingMore, hasMore, preRegisteredMembers.length, debouncedSearchTerm, matchFilter]);

    // IntersectionObserver를 사용한 무한 스크롤 감지
    useEffect(() => {
        const loadMoreElement = loadMoreRef.current;
        if (!loadMoreElement) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoadingMembers) {
                    loadMoreMembers();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(loadMoreElement);

        return () => {
            observer.disconnect();
        };
    }, [hasMore, isLoadingMore, isLoadingMembers, loadMoreMembers]);

    // 엑셀 템플릿 다운로드
    const handleDownloadTemplate = () => {
        // 템플릿 데이터 (예시) - 소유유형은 시스템에서 지분율 기반으로 자동 분류
        // 법정동과 지번을 분리하여 여러 지번을 쉼표로 입력 가능
        const templateData = [
            {
                소유주명: '홍길동',
                핸드폰번호: '010-1234-5678',
                거주주소: '서울시 강남구 테헤란로 123',
                법정동: '서울특별시 강남구 역삼동',
                지번: '123-4',
                '소유지 도로명': '서울시 강남구 테헤란로 456',
                건물이름: '역삼 타워',
                동: '101',
                호수: '1001',
                '토지소유면적(m2)': 42.5,
                '토지지분율(%)': 100,
                '건축물소유면적(m2)': 84.5,
                '건축물지분율(%)': 100,
                '공시지가(원)': 850000000,
                특이사항: '',
            },
            {
                소유주명: '김철수',
                핸드폰번호: '010-9876-5432',
                거주주소: '서울시 서초구 반포대로 789',
                법정동: '서울특별시 강남구 역삼동',
                지번: '123-4, 123-5',
                '소유지 도로명': '서울시 강남구 테헤란로 456',
                건물이름: '역삼 타워',
                동: '101',
                호수: '1001',
                '토지소유면적(m2)': 21.25,
                '토지지분율(%)': '1/2',
                '건축물소유면적(m2)': 42.25,
                '건축물지분율(%)': '50%',
                '공시지가(원)': 850000000,
                특이사항: '공동명의 (여러 지번 소유)',
            },
            {
                소유주명: '',
                핸드폰번호: '',
                거주주소: '',
                법정동: '',
                지번: '',
                '소유지 도로명': '',
                건물이름: '',
                동: '',
                호수: '',
                '토지소유면적(m2)': '',
                '토지지분율(%)': '',
                '건축물소유면적(m2)': '',
                '건축물지분율(%)': '',
                '공시지가(원)': '',
                특이사항: '',
            },
        ];

        // 안내 시트 데이터 (소유유형은 시스템에서 지분율 기반으로 자동 분류)
        const guideData = [
            { 항목: '소유주명', 필수여부: '필수', 설명: '조합원 이름' },
            { 항목: '핸드폰번호', 필수여부: '선택', 설명: '연락처 (하이픈 포함 가능)' },
            { 항목: '거주주소', 필수여부: '선택', 설명: '실거주 주소' },
            {
                항목: '법정동',
                필수여부: '필수',
                설명: '법정동 주소 (예: 서울특별시 강남구 역삼동). 시도+시군구+읍면동 형식 필수',
            },
            {
                항목: '지번',
                필수여부: '필수',
                설명: '지번 (예: 123-4). 쉼표로 여러 지번 입력 가능 (예: 123-4, 123-5, 124-1)',
            },
            { 항목: '소유지 도로명', 필수여부: '선택', 설명: '물건지 도로명 주소' },
            { 항목: '건물이름', 필수여부: '선택', 설명: '아파트/빌라 등 건물명' },
            { 항목: '동', 필수여부: '선택', 설명: '동 번호 (예: 101, A동, 제1호, 지하1)' },
            { 항목: '호수', 필수여부: '선택', 설명: '호수 (예: 1001, 101호, 비01)' },
            { 항목: '토지소유면적(m2)', 필수여부: '선택', 설명: '토지 소유 면적 (0이나 빈값은 저장되지 않음)' },
            {
                항목: '토지지분율(%)',
                필수여부: '선택',
                설명: '토지 지분율 (예: 33.2/123, 1/2, 50%, 0.5, 50). 100% 미만이면 공동소유로 자동 분류',
            },
            { 항목: '건축물소유면적(m2)', 필수여부: '선택', 설명: '건축물 소유 면적 (0이나 빈값은 저장되지 않음)' },
            {
                항목: '건축물지분율(%)',
                필수여부: '선택',
                설명: '건축물 지분율 (예: 33.2/123, 1/2, 50%, 0.5, 50). 100% 미만이면 공동소유로 자동 분류',
            },
            { 항목: '공시지가(원)', 필수여부: '선택', 설명: '공시지가 (원)' },
            { 항목: '특이사항', 필수여부: '선택', 설명: '기타 메모' },
            { 항목: '', 필수여부: '', 설명: '' },
            { 항목: '[법정동 입력 주의사항]', 필수여부: '', 설명: '' },
            {
                항목: '올바른 형식',
                필수여부: '',
                설명: '서울특별시 강남구 역삼동 / 서울 강남구 역삼동 / 경기도 성남시 분당구 판교동',
            },
            { 항목: '잘못된 형식', 필수여부: '', 설명: '역삼동 (시도/시군구 없음) / 테헤란로 (도로명)' },
            { 항목: '', 필수여부: '', 설명: '' },
            { 항목: '[지번 입력 예시]', 필수여부: '', 설명: '' },
            { 항목: '단일 지번', 필수여부: '', 설명: '123-4' },
            { 항목: '여러 지번', 필수여부: '', 설명: '123-4, 123-5, 124-1 (쉼표로 구분)' },
            { 항목: '산 지번', 필수여부: '', 설명: '산 123, 산 123-4' },
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const guideSheet = XLSX.utils.json_to_sheet(guideData);

        // 컬럼 너비 설정 (템플릿) - 법정동과 지번 분리
        worksheet['!cols'] = [
            { wch: 12 }, // 소유주명
            { wch: 16 }, // 핸드폰번호
            { wch: 35 }, // 거주주소
            { wch: 30 }, // 법정동 (시도 시군구 읍면동)
            { wch: 25 }, // 지번 (쉼표 구분 가능)
            { wch: 35 }, // 소유지 도로명
            { wch: 15 }, // 건물이름
            { wch: 8 }, // 동
            { wch: 8 }, // 호수
            { wch: 16 }, // 토지소유면적
            { wch: 15 }, // 토지지분율 (분수 형식 입력 가능)
            { wch: 18 }, // 건축물소유면적
            { wch: 15 }, // 건축물지분율 (분수 형식 입력 가능)
            { wch: 15 }, // 공시지가
            { wch: 25 }, // 특이사항
        ];

        // 컬럼 너비 설정 (안내)
        guideSheet['!cols'] = [
            { wch: 20 }, // 항목
            { wch: 10 }, // 필수여부
            { wch: 55 }, // 설명
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '조합원 템플릿');
        XLSX.utils.book_append_sheet(workbook, guideSheet, '입력 안내');
        XLSX.writeFile(workbook, '조합원_업로드_템플릿.xlsx');
    };

    /**
     * 지분율 파싱 - 다양한 형식을 퍼센트(0~100)로 변환
     * 소수점 2째자리까지 반올림하여 반환
     *
     * @param value - "33.2/123", "1/2", "50%", "0.5", "50", 0 등
     * @returns 퍼센트 값 (예: 26.99) 또는 undefined
     */
    const parseOwnershipRatio = (value: unknown): number | undefined => {
        if (value === null || value === undefined || value === '') return undefined;

        const str = String(value).trim();
        if (!str || str === '0') return undefined; // 0은 소유 없음으로 처리

        let result: number | undefined;

        // 1. 분수 형식 (예: "1/2", "33.2/123", "3/4")
        const fractionMatch = str.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
        if (fractionMatch) {
            const numerator = parseFloat(fractionMatch[1]);
            const denominator = parseFloat(fractionMatch[2]);
            if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                result = (numerator / denominator) * 100;
            }
        }

        // 2. 퍼센트 형식 (예: "50%", "26.99%")
        if (result === undefined) {
            const percentMatch = str.match(/^([\d.]+)\s*%$/);
            if (percentMatch) {
                result = parseFloat(percentMatch[1]);
            }
        }

        // 3. 숫자 형식
        if (result === undefined) {
            const num = parseFloat(str);
            if (!isNaN(num)) {
                // 소수점 형식 (0 < value <= 1) → 퍼센트로 변환
                if (num > 0 && num <= 1) {
                    result = num * 100;
                }
                // 이미 퍼센트 형식 (1 < value <= 100)
                else if (num > 1 && num <= 100) {
                    result = num;
                }
            }
        }

        // 소수점 2째자리까지 반올림
        if (result !== undefined) {
            return Math.round(result * 100) / 100;
        }

        return undefined;
    };

    /**
     * 면적 파싱 - 0 또는 빈 값은 undefined로 처리
     */
    const parseArea = (value: unknown): number | undefined => {
        if (value === null || value === undefined || value === '') return undefined;
        const parsed = parseFloat(String(value));
        if (isNaN(parsed) || parsed === 0) return undefined;
        return parsed;
    };

    // 엑셀 파일 업로드 처리 → 바로 비동기 처리 시작
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedUnionId) return;

        setIsUploading(true);
        setSaveResult(null);
        setCurrentJobId(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawJsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

            // 엑셀 헤더의 앞뒤 공백 제거 (예: "소유지 지번 " → "소유지 지번")
            const jsonData = rawJsonData.map((row) => {
                const normalizedRow: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(row)) {
                    normalizedRow[key.trim()] = value;
                }
                return normalizedRow;
            });

            // flatMap을 사용하여 쉼표로 구분된 지번을 분리 처리
            const members: MemberExcelRow[] = jsonData.flatMap((row) => {
                const name = String(row['소유주명'] || '').trim();

                // 새 형식: 법정동 + 지번 분리
                const bjdAddress = String(row['법정동'] || '').trim();
                const jibunRaw = String(row['지번'] || '').trim();

                // 하위 호환성: 기존 '소유지 지번' 컬럼도 지원 (전체 주소가 입력된 경우)
                const legacyAddress = String(row['소유지 지번'] || '').trim();

                // 필수 필드 체크: 이름 + (법정동+지번 또는 기존 소유지 지번)
                const hasNewFormat = bjdAddress && jibunRaw;
                const hasLegacyFormat = legacyAddress;

                if (!name || (!hasNewFormat && !hasLegacyFormat)) return [];

                // 전체 주소 목록 생성
                let propertyAddresses: string[] = [];

                if (hasNewFormat) {
                    // 새 형식: 법정동 + 지번 조합
                    // 지번을 쉼표로 분리하고, 법정동과 조합하여 전체 주소 생성
                    const jibuns = jibunRaw
                        .split(',')
                        .map((j) => j.trim())
                        .filter((j) => j.length > 0);
                    propertyAddresses = jibuns.map((jibun) => `${bjdAddress} ${jibun}`.trim());
                } else {
                    // 하위 호환: 기존 형식 (전체 주소가 쉼표로 구분)
                    propertyAddresses = legacyAddress
                        .split(',')
                        .map((addr) => addr.trim())
                        .filter((addr) => addr.length > 0);
                }

                if (propertyAddresses.length === 0) return [];

                // 공통 데이터 (지번 외 나머지)
                const commonData = {
                    name,
                    phoneNumber: row['핸드폰번호'] ? String(row['핸드폰번호']).replace(/[^\d]/g, '').trim() : undefined,
                    residentAddress: row['거주주소'] ? String(row['거주주소']).trim() : undefined,
                    propertyRoadAddress: row['소유지 도로명'] ? String(row['소유지 도로명']).trim() : undefined,
                    buildingName: row['건물이름'] ? String(row['건물이름']).trim() : undefined,
                    // 동호수 정규화 적용: 접미사 제거 및 지하층 표시 통일
                    dong: row['동'] ? normalizeDong(String(row['동'])) ?? undefined : undefined,
                    ho: row['호수'] ? normalizeHo(String(row['호수'])) ?? undefined : undefined,
                    // 토지 면적/지분율 (0이나 빈 값은 undefined로 처리)
                    landArea: parseArea(row['토지소유면적(m2)']),
                    landOwnershipRatio: parseOwnershipRatio(row['토지지분율(%)']),
                    // 건축물 면적/지분율 (0이나 빈 값은 undefined로 처리)
                    buildingArea: parseArea(row['건축물소유면적(m2)']),
                    buildingOwnershipRatio: parseOwnershipRatio(row['건축물지분율(%)']),
                    // 하위 호환성: 기존 면적/지분율 필드도 처리
                    area: parseArea(row['면적(m2)']),
                    ownershipRatio: parseOwnershipRatio(row['지분율(%)']),
                    // 공시지가
                    officialPrice: row['공시지가(원)']
                        ? parseInt(String(row['공시지가(원)']).replace(/[,\s]/g, ''), 10)
                        : undefined,
                    // 소유유형: 시스템에서 지분율 기반으로 자동 분류 (엑셀에서 제거됨)
                    notes: row['특이사항'] ? String(row['특이사항']).trim() : undefined,
                };

                // 각 지번마다 별도 레코드 생성
                return propertyAddresses.map((address) => ({
                    ...commonData,
                    propertyAddress: address,
                }));
            });

            if (members.length === 0) {
                alert('유효한 데이터가 없습니다. 소유주명과 법정동/지번은 필수입니다.');
                return;
            }

            setUploadedCount(members.length);

            // 바로 비동기 처리 시작 (GIS 매칭 + 저장)
            const response = await fetch('/api/member-invite/pre-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    unionId: selectedUnionId,
                    members: members,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '비동기 처리 요청에 실패했습니다.');
            }

            const result = await response.json();
            setCurrentJobId(result.jobId);
        } catch (error) {
            console.error('Excel upload/process error:', error);
            alert('처리 중 오류가 발생했습니다.');
            setUploadedCount(0);
        } finally {
            setIsUploading(false);
            event.target.value = ''; // 파일 입력 초기화
        }
    };

    // 비매칭 조합원 수정 모달 열기 (행 클릭 시)
    const handleUnmatchedRowClick = (member: PreRegisteredMember) => {
        // 비매칭(property_pnu가 null)인 경우에만 모달 열기
        if (!member.property_pnu) {
            setManualMatchModal({
                open: true,
                member,
                newAddress: member.property_address_jibun || '',
                dong: member.property_dong || '',
                ho: member.property_ho || '',
            });
        }
    };

    // 행 스타일 - 비매칭인 경우 클릭 가능함을 표시
    const getRowClassName = (member: PreRegisteredMember) => {
        if (!member.property_pnu) {
            return 'cursor-pointer hover:bg-amber-900/20';
        }
        return '';
    };

    // 비매칭 조합원 정보 수정 및 GIS 재매칭
    const handleUpdateUnmatchedMember = async () => {
        if (!manualMatchModal.member || !selectedUnionId) return;

        setIsManualMatching(true);
        try {
            // 동호수 정규화 적용
            const normalizedDong = normalizeDong(manualMatchModal.dong);
            const normalizedHo = normalizeHo(manualMatchModal.ho);

            const result = await updateUnmatchedMember(
                manualMatchModal.member.id,
                selectedUnionId,
                manualMatchModal.newAddress,
                normalizedDong ?? undefined,
                normalizedHo ?? undefined
            );

            if (result.success) {
                if (result.matched) {
                    alert('GIS 매칭이 완료되었습니다.');
                } else {
                    alert('정보가 저장되었습니다. (GIS 매칭 실패 - 주소를 확인해주세요)');
                }
                setManualMatchModal({ open: false, member: null, newAddress: '', dong: '', ho: '' });
                await fetchMembers();
            } else {
                alert(`저장 실패: ${result.error}`);
            }
        } catch (error) {
            console.error('Update unmatched member error:', error);
            alert('정보 수정 중 오류가 발생했습니다.');
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

    // 전체 데이터 초기화 실행
    const handleResetAll = async () => {
        if (!selectedUnionId) return;

        setIsResetting(true);
        try {
            const result = await deleteAllPreRegisteredMembers(selectedUnionId);
            if (result.success) {
                alert(`${result.deletedCount}명의 조합원 데이터가 초기화되었습니다.`);
                await fetchMembers();
            } else {
                alert(`초기화 실패: ${result.error}`);
            }
        } catch (error) {
            console.error('Reset all error:', error);
            alert('초기화 중 오류가 발생했습니다.');
        } finally {
            setIsResetting(false);
            setResetConfirm(false);
        }
    };

    // GIS 동기화 실행
    const handleSyncProperties = async () => {
        if (!selectedUnionId) return;

        setIsSyncing(true);
        setSyncResult(null);

        try {
            const response = await fetch('/api/member-invite/sync-properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unionId: selectedUnionId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'GIS 동기화 요청에 실패했습니다.');
            }

            const result = await response.json();
            setSyncJobId(result.jobId);
        } catch (error) {
            console.error('Sync properties error:', error);
            alert('GIS 동기화 중 오류가 발생했습니다.');
            setIsSyncing(false);
        }
    };

    // 서버에서 이미 필터링된 데이터이므로 그대로 사용
    const filteredMembers = preRegisteredMembers;

    // 선택된 조합 객체
    const selectedUnion = unions.find((u) => u.id === selectedUnionId);

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="w-7 h-7" />
                        조합원 관리
                    </h1>
                    <p className="text-slate-400 mt-1">조합원 데이터를 사전 등록하고 GIS 데이터와 매칭합니다.</p>
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
                    <Select value={selectedUnionId} onValueChange={setSelectedUnionId} disabled={isLoadingUnions}>
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
                                {selectedUnion?.name} - 조합원 일괄 등록
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
                                    className="bg-white border-slate-300 text-slate-900 hover:bg-slate-100"
                                >
                                    <Download className="w-4 h-4 mr-2 text-slate-900" />
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
                                    <Button className="bg-blue-600 hover:bg-blue-700" disabled={isUploading}>
                                        <Upload className="w-4 h-4 mr-2" />
                                        {isUploading ? '업로드 중...' : '엑셀 업로드'}
                                    </Button>
                                </div>
                            </div>

                            {/* 비동기 처리 진행률 표시 */}
                            {currentJobId && jobStatus && (
                                <div className="mt-4 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {(jobStatus.status === 'processing' || jobStatus.status === 'pending') && (
                                                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                            )}
                                            <span className="text-sm font-medium text-blue-300">
                                                {jobStatus.status === 'pending' && '대기 중...'}
                                                {jobStatus.status === 'processing' &&
                                                    (jobStatus.result?.phase === 'MATCHING'
                                                        ? 'GIS 매칭 중...'
                                                        : jobStatus.result?.phase === 'SAVING'
                                                        ? 'DB 저장 중...'
                                                        : '처리 중...')}
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
                                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-blue-400">
                                        <span>총 {jobStatus.totalCount || uploadedCount}건</span>
                                        {jobStatus.result?.matchedCount !== undefined && (
                                            <span className="text-emerald-400">
                                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                                매칭: {jobStatus.result.matchedCount}건
                                            </span>
                                        )}
                                        {jobStatus.result?.unmatchedCount !== undefined && (
                                            <span className="text-amber-400">
                                                <AlertTriangle className="w-3 h-3 inline mr-1" />
                                                비매칭: {jobStatus.result.unmatchedCount}건
                                            </span>
                                        )}
                                        {jobStatus.result?.savedCount !== undefined && (
                                            <span className="text-emerald-400">
                                                신규: {jobStatus.result.savedCount}건
                                            </span>
                                        )}
                                        {jobStatus.result?.updatedCount !== undefined &&
                                            jobStatus.result.updatedCount > 0 && (
                                                <span className="text-blue-400">
                                                    업데이트: {jobStatus.result.updatedCount}건
                                                </span>
                                            )}
                                        {jobStatus.result?.duplicateCount !== undefined &&
                                            jobStatus.result.duplicateCount > 0 && (
                                                <span className="text-amber-400">
                                                    중복: {jobStatus.result.duplicateCount}건
                                                </span>
                                            )}
                                    </div>
                                </div>
                            )}

                            {/* 처리 결과 표시 */}
                            {saveResult && !currentJobId && (
                                <div
                                    className={`mt-4 p-4 rounded-lg ${
                                        saveResult.success
                                            ? 'bg-emerald-500/20 border border-emerald-500/30'
                                            : 'bg-amber-500/20 border border-amber-500/30'
                                    }`}
                                >
                                    <div className="flex flex-wrap gap-4 mb-2">
                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            매칭됨: {saveResult.matchedCount}건
                                        </Badge>
                                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            비매칭: {saveResult.unmatchedCount}건
                                        </Badge>
                                        {saveResult.updatedCount > 0 && (
                                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                업데이트: {saveResult.updatedCount}건
                                            </Badge>
                                        )}
                                        {saveResult.duplicateCount > 0 && (
                                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                                <XCircle className="w-3 h-3 mr-1" />
                                                중복: {saveResult.duplicateCount}건
                                            </Badge>
                                        )}
                                    </div>
                                    <p
                                        className={`font-medium ${
                                            saveResult.success ? 'text-emerald-400' : 'text-amber-400'
                                        }`}
                                    >
                                        {saveResult.savedCount > 0
                                            ? `${saveResult.savedCount}건이 신규 저장되었습니다.`
                                            : saveResult.updatedCount > 0
                                            ? `${saveResult.updatedCount}건이 업데이트되었습니다.`
                                            : '처리된 항목이 없습니다.'}
                                        {saveResult.savedCount > 0 &&
                                            saveResult.updatedCount > 0 &&
                                            ` (업데이트: ${saveResult.updatedCount}건)`}
                                    </p>
                                    {saveResult.errors.length > 0 && (
                                        <details className="mt-2">
                                            <summary className="text-sm text-amber-300 cursor-pointer">
                                                오류 목록 ({saveResult.errors.length}건)
                                            </summary>
                                            <ul className="mt-2 text-sm text-amber-300 list-disc list-inside max-h-32 overflow-auto">
                                                {saveResult.errors.slice(0, 20).map((err, idx) => (
                                                    <li key={idx}>{err}</li>
                                                ))}
                                                {saveResult.errors.length > 20 && (
                                                    <li>외 {saveResult.errors.length - 20}건...</li>
                                                )}
                                            </ul>
                                        </details>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={resetUploadState}
                                        className="mt-3 border-slate-600 text-slate-300 hover:bg-slate-700"
                                    >
                                        확인
                                    </Button>
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
                                        총 {totalMemberCount}명
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleSyncProperties}
                                        disabled={isSyncing || !!syncJobId}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        <RefreshCw
                                            className={`w-4 h-4 mr-2 ${isSyncing || syncJobId ? 'animate-spin' : ''}`}
                                        />
                                        {isSyncing || syncJobId ? 'GIS 동기화 중...' : 'GIS 동기화'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={fetchMembers}
                                        disabled={isLoadingMembers}
                                        className="bg-white border-slate-300 text-black hover:bg-slate-100"
                                    >
                                        <RefreshCw
                                            className={`w-4 h-4 mr-2 text-black ${
                                                isLoadingMembers ? 'animate-spin' : ''
                                            }`}
                                        />
                                        새로고침
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setResetConfirm(true)}
                                        disabled={isResetting || preRegisteredMembers.length === 0}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        데이터 초기화
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* GIS 동기화 진행률 표시 */}
                            {syncJobId && syncJobStatus && (
                                <div className="mb-4 p-4 bg-emerald-900/30 rounded-lg border border-emerald-500/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                            <span className="text-sm font-medium text-emerald-300">
                                                GIS 동기화 중...
                                            </span>
                                        </div>
                                        <span className="text-sm font-semibold text-emerald-300">
                                            {syncJobStatus.progress}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-emerald-900 rounded-full h-2">
                                        <div
                                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${syncJobStatus.progress}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-emerald-400">
                                        <span>총 {syncJobStatus.totalCount || 0}건</span>
                                        {syncJobStatus.result?.syncedCount !== undefined && (
                                            <span className="text-emerald-400">
                                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                                동기화: {syncJobStatus.result.syncedCount}건
                                            </span>
                                        )}
                                        {syncJobStatus.result?.skippedCount !== undefined &&
                                            syncJobStatus.result.skippedCount > 0 && (
                                                <span className="text-slate-400">
                                                    스킵: {syncJobStatus.result.skippedCount}건
                                                </span>
                                            )}
                                        {syncJobStatus.result?.failedCount !== undefined &&
                                            syncJobStatus.result.failedCount > 0 && (
                                                <span className="text-amber-400">
                                                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                                                    실패: {syncJobStatus.result.failedCount}건
                                                </span>
                                            )}
                                    </div>
                                </div>
                            )}

                            {/* GIS 동기화 결과 표시 */}
                            {syncResult && !syncJobId && (
                                <div
                                    className={`mb-4 p-4 rounded-lg ${
                                        syncResult.failedCount === 0
                                            ? 'bg-emerald-500/20 border border-emerald-500/30'
                                            : 'bg-amber-500/20 border border-amber-500/30'
                                    }`}
                                >
                                    <div className="flex flex-wrap gap-4 mb-2">
                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            동기화: {syncResult.syncedCount}건
                                        </Badge>
                                        {syncResult.skippedCount > 0 && (
                                            <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                                                스킵: {syncResult.skippedCount}건 (이미 연결됨)
                                            </Badge>
                                        )}
                                        {syncResult.failedCount > 0 && (
                                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                실패: {syncResult.failedCount}건
                                            </Badge>
                                        )}
                                    </div>
                                    <p
                                        className={`font-medium ${
                                            syncResult.failedCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                                        }`}
                                    >
                                        GIS 동기화 완료 - {syncResult.syncedCount}건이 연결되었습니다.
                                    </p>
                                    {syncResult.errors.length > 0 && (
                                        <details className="mt-2">
                                            <summary className="text-sm text-amber-300 cursor-pointer">
                                                오류 목록 ({syncResult.errors.length}건)
                                            </summary>
                                            <ul className="mt-2 text-sm text-amber-300 list-disc list-inside max-h-32 overflow-auto">
                                                {syncResult.errors.slice(0, 20).map((err, idx) => (
                                                    <li key={idx}>{err}</li>
                                                ))}
                                                {syncResult.errors.length > 20 && (
                                                    <li>외 {syncResult.errors.length - 20}건...</li>
                                                )}
                                            </ul>
                                        </details>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSyncResult(null)}
                                        className="mt-3 border-slate-600 text-slate-300 hover:bg-slate-700"
                                    >
                                        확인
                                    </Button>
                                </div>
                            )}

                            <div className="mb-4 flex flex-wrap gap-4">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="이름, 전화번호, 주소로 검색..."
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                                    />
                                </div>
                                <Select
                                    value={matchFilter}
                                    onValueChange={(value) => setMatchFilter(value as 'all' | 'matched' | 'unmatched')}
                                >
                                    <SelectTrigger className="w-[140px] bg-slate-700 border-slate-600 text-white">
                                        <SelectValue placeholder="매칭 상태" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">전체</SelectItem>
                                        <SelectItem value="matched">매칭됨</SelectItem>
                                        <SelectItem value="unmatched">비매칭</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="max-h-[676px] overflow-auto rounded-lg border border-slate-700">
                                <DataTable<PreRegisteredMember>
                                    data={filteredMembers}
                                    columns={memberColumns}
                                    keyExtractor={(row) => row.id}
                                    isLoading={isLoadingMembers}
                                    emptyMessage={
                                        inputValue || matchFilter !== 'all'
                                            ? '검색 결과가 없습니다.'
                                            : '사전 등록된 조합원이 없습니다.'
                                    }
                                    emptyIcon={<Users className="w-12 h-12 text-slate-500" />}
                                    variant="dark"
                                    onRowClick={handleUnmatchedRowClick}
                                    getRowClassName={getRowClassName}
                                    actions={{
                                        render: (member) => (
                                            <div className="flex items-center gap-1">
                                                {/* 비매칭인 경우에만 수정 버튼 표시 */}
                                                {!member.property_pnu && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUnmatchedRowClick(member);
                                                        }}
                                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                                                        title="주소 수정"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirm({ open: true, member });
                                                    }}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                                    title="삭제"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ),
                                        headerText: '작업',
                                    }}
                                    minWidth="1100px"
                                />

                                {/* 무한 스크롤 로딩 표시기 및 감지 요소 */}
                                <div ref={loadMoreRef} className="py-4 flex justify-center items-center">
                                    {isLoadingMore && (
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-sm">더 불러오는 중...</span>
                                        </div>
                                    )}
                                    {!hasMore && preRegisteredMembers.length > 0 && (
                                        <span className="text-sm text-slate-500">
                                            전체 {totalMemberCount}명 중 {preRegisteredMembers.length}명 표시됨
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* 비매칭 조합원 수정 모달 */}
            <Dialog
                open={manualMatchModal.open}
                onOpenChange={(open) =>
                    !open && setManualMatchModal({ open: false, member: null, newAddress: '', dong: '', ho: '' })
                }
            >
                <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-amber-400" />
                            비매칭 조합원 정보 수정
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            소유지 정보를 수정하고 GIS 데이터와 재매칭합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* 읽기 전용 정보 */}
                        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-slate-500 text-xs">소유주명</Label>
                                    <p className="text-white font-medium mt-1">
                                        {manualMatchModal.member?.name || '-'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-slate-500 text-xs">전화번호</Label>
                                    <p className="text-slate-300 mt-1">
                                        {manualMatchModal.member?.phone_number || '-'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 수정 가능 필드 */}
                        <div>
                            <Label className="text-slate-300">
                                소유지 지번 <span className="text-amber-400">*</span>
                            </Label>
                            <Input
                                value={manualMatchModal.newAddress}
                                onChange={(e) =>
                                    setManualMatchModal((prev) => ({ ...prev, newAddress: e.target.value }))
                                }
                                placeholder="예: 서울시 강남구 역삼동 123-4"
                                className="mt-1 bg-slate-700 border-slate-600 text-white"
                            />
                            <p className="text-xs text-slate-500 mt-1">법정동 + 지번 형식으로 입력하세요</p>
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

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() =>
                                setManualMatchModal({ open: false, member: null, newAddress: '', dong: '', ho: '' })
                            }
                            className="border-slate-600 text-slate-300"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleUpdateUnmatchedMember}
                            disabled={isManualMatching || !manualMatchModal.newAddress}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isManualMatching ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    저장 중...
                                </>
                            ) : (
                                '저장 및 재매칭'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 삭제 확인 다이얼로그 */}
            <AlertDialog
                open={deleteConfirm.open}
                onOpenChange={(open) => !open && setDeleteConfirm({ open: false, member: null })}
            >
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">조합원 삭제</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            {deleteConfirm.member?.name}님의 사전 등록 정보를 삭제하시겠습니까?
                            <br />이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 전체 초기화 확인 다이얼로그 */}
            <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            조합원 데이터 초기화
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            <span className="text-red-400 font-semibold">{selectedUnion?.name}</span>의 사전 등록된
                            조합원 데이터{' '}
                            <span className="text-red-400 font-semibold">{preRegisteredMembers.length}명</span>
                            을 모두 삭제하시겠습니까?
                            <br />
                            <br />
                            <span className="text-red-400 font-medium">⚠️ 이 작업은 되돌릴 수 없습니다.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            disabled={isResetting}
                        >
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleResetAll}
                            disabled={isResetting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isResetting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    초기화 중...
                                </>
                            ) : (
                                '전체 삭제'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
