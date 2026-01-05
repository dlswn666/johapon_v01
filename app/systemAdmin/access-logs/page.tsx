'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ClipboardList,
    Loader2,
    Calendar,
    Building,
    Trash2,
    User,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import {
    useAccessLogsInfinite,
    useDeleteOldLogs,
    useUnionsForFilter,
    ACCESS_TYPE_LABELS,
} from '@/app/_lib/features/member-management/api/useAccessLogHook';
import { AccessType } from '@/app/_lib/shared/type/database.types';
import { SelectBox } from '@/app/_lib/widgets/common/select-box';
import { DataTable, ColumnDef } from '@/app/_lib/widgets/common/data-table';

// 접속 로그 타입 정의
interface AccessLog {
    id: string;
    union?: { name: string } | null;
    viewer_name: string;
    access_type: string;
    ip_address: string | null;
    accessed_at: string;
}

// 날짜 포맷 함수
function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// 접속 로그 테이블 컬럼 정의
const accessLogColumns: ColumnDef<AccessLog>[] = [
    {
        key: 'union',
        header: '조합',
        accessor: (row) => row.union?.name || '-',
    },
    {
        key: 'viewer_name',
        header: '관리자',
        render: (value) => (
            <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">{value as string}</span>
            </div>
        ),
    },
    {
        key: 'access_type',
        header: '접근 유형',
        render: (value) => (
            <span
                className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                    value === 'LIST_VIEW' && 'bg-blue-100 text-blue-700',
                    value === 'DETAIL_VIEW' && 'bg-green-100 text-green-700',
                    value === 'MEMBER_UPDATE' && 'bg-yellow-100 text-yellow-700',
                    value === 'MEMBER_BLOCK' && 'bg-red-100 text-red-700'
                )}
            >
                {ACCESS_TYPE_LABELS[value as AccessType]}
            </span>
        ),
    },
    {
        key: 'ip_address',
        header: 'IP 주소',
        className: 'text-gray-600 font-mono',
        render: (value) => (value as string) || '-',
    },
    {
        key: 'accessed_at',
        header: '접속 일시',
        className: 'text-gray-600',
        render: (value) => formatDate(value as string),
    },
];

export default function AccessLogsPage() {
    const router = useRouter();
    const { isLoading: authLoading, isSystemAdmin } = useAuth();

    // 필터 상태
    const [selectedUnionId, setSelectedUnionId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const pageSize = 20;

    // 로그 삭제 확인 모달
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // 접근 권한 체크
    useEffect(() => {
        if (!authLoading && !isSystemAdmin) {
            router.replace('/');
        }
    }, [authLoading, isSystemAdmin, router]);

    // 조합 목록 조회
    const { data: unions } = useUnionsForFilter();

    // 접속 로그 조회 (무한 스크롤)
    const {
        data: logsData,
        isLoading: logsLoading,
        refetch: refetchLogs,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useAccessLogsInfinite({
        unionId: selectedUnionId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        pageSize,
    });

    // 로그 삭제 mutation
    const { mutateAsync: deleteOldLogs, isPending: isDeleting } = useDeleteOldLogs();

    // 페이지 데이터 평탄화
    const logs = useMemo(() => {
        return logsData?.pages.flatMap((page) => page.logs) || [];
    }, [logsData?.pages]);

    const totalCount = logsData?.pages[0]?.total || 0;

    // 필터 초기화
    const handleResetFilters = () => {
        setSelectedUnionId('');
        setStartDate('');
        setEndDate('');
    };

    // 로그 삭제 실행
    const handleDeleteOldLogs = async () => {
        try {
            const deletedCount = await deleteOldLogs(12);
            toast.success(`총 ${deletedCount}건의 로그가 삭제되었습니다.`);
            setShowDeleteConfirm(false);
            refetchLogs();
        } catch (error) {
            console.error('로그 삭제 오류:', error);
            toast.error('로그 삭제에 실패했습니다.');
        }
    };

    // 권한 체크 중
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!isSystemAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* 페이지 헤더 */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">접속 로그 관리</h1>
                    <p className="text-gray-600">
                        조합 관리자의 조합원 정보 접근 기록을 조회합니다 (개인정보보호법 준수)
                    </p>
                </div>

                {/* 필터 */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-end">
                        {/* 조합 필터 */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Building className="w-4 h-4 inline mr-1" />
                                조합
                            </label>
                            <SelectBox
                                value={selectedUnionId}
                                onChange={(value) => {
                                    setSelectedUnionId(value);
                                }}
                                options={[
                                    { value: '', label: '전체 조합' },
                                    ...(unions?.map((u) => ({
                                        value: u.id,
                                        label: u.name,
                                    })) || []),
                                ]}
                                className="w-full"
                            />
                        </div>

                        {/* 시작일 */}
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                시작일
                            </label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                }}
                                className="h-10"
                            />
                        </div>

                        {/* 종료일 */}
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                종료일
                            </label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                }}
                                className="h-10"
                            />
                        </div>

                        {/* 버튼 */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleResetFilters}
                                className="h-10 border-gray-300 text-gray-700"
                            >
                                초기화
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="h-10"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                1년 경과 로그 정리
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 로그 목록 */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {/* 헤더 */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <ClipboardList className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">접속 기록</h2>
                                <p className="text-sm text-gray-600">총 {totalCount}건</p>
                            </div>
                        </div>
                    </div>

                    {/* 테이블 */}
                    <DataTable<AccessLog>
                        data={logs as AccessLog[]}
                        columns={accessLogColumns}
                        keyExtractor={(row) => row.id}
                        isLoading={logsLoading}
                        emptyMessage="접속 기록이 없습니다."
                        emptyIcon={<ClipboardList className="w-12 h-12 text-gray-300" />}
                        infiniteScroll={{
                            hasNextPage: hasNextPage ?? false,
                            isFetchingNextPage,
                            fetchNextPage,
                            totalItems: totalCount,
                        }}
                        minWidth="800px"
                    />
                </div>

                {/* 안내 문구 */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <p className="text-[14px] font-medium text-blue-800">
                                개인정보보호법 안전성 확보조치 기준 제8조에 따른 접속기록 관리
                            </p>
                            <p className="text-[13px] text-blue-700 mt-1">
                                접속기록은 최소 1년 이상 보관되며, 정기적인 점검을 통해 이상 접속 여부를
                                모니터링해야 합니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 로그 삭제 확인 모달 */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>1년 경과 로그 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            1년이 경과한 접속 로그를 삭제하시겠습니까?
                            <br />
                            <strong className="text-red-600">삭제된 로그는 복구할 수 없습니다.</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteOldLogs}
                            disabled={isDeleting}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
