'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ClipboardList,
    Loader2,
    Calendar,
    Building,
    Trash2,
    ChevronLeft,
    ChevronRight,
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
    useAccessLogs,
    useDeleteOldLogs,
    useUnionsForFilter,
    ACCESS_TYPE_LABELS,
} from '@/app/_lib/features/member-management/api/useAccessLogHook';
import { SelectBox } from '@/app/_lib/widgets/common/select-box';

export default function AccessLogsPage() {
    const router = useRouter();
    const { isLoading: authLoading, isSystemAdmin } = useAuth();

    // 필터 상태
    const [selectedUnionId, setSelectedUnionId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [page, setPage] = useState(1);
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

    // 접속 로그 조회
    const {
        data: logsData,
        isLoading: logsLoading,
        refetch: refetchLogs,
    } = useAccessLogs({
        unionId: selectedUnionId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize,
    });

    // 로그 삭제 mutation
    const { mutateAsync: deleteOldLogs, isPending: isDeleting } = useDeleteOldLogs();

    const totalPages = Math.ceil((logsData?.total || 0) / pageSize);

    // 필터 초기화
    const handleResetFilters = () => {
        setSelectedUnionId('');
        setStartDate('');
        setEndDate('');
        setPage(1);
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

    // 날짜 포맷
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
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
                                    setPage(1);
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
                                    setPage(1);
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
                                    setPage(1);
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
                <div className="bg-white rounded-xl shadow-sm overflow-hidden relative min-h-[400px]">
                    {/* 헤더 */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <ClipboardList className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">접속 기록</h2>
                                <p className="text-sm text-gray-600">총 {logsData?.total || 0}건</p>
                            </div>
                        </div>
                    </div>

                    {/* 로딩 상태 */}
                    {logsLoading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                <p className="text-sm font-medium text-gray-500">데이터를 불러오는 중...</p>
                            </div>
                        </div>
                    )}

                    {/* 빈 상태 */}
                    {!logsLoading && (!logsData?.logs || logsData.logs.length === 0) ? (
                        <div className="p-8 text-center text-gray-500 text-[18px]">
                            접속 기록이 없습니다.
                        </div>
                    ) : (
                        <>
                            {/* 테이블 */}
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[800px]">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-4 text-left text-[14px] font-bold text-gray-700">
                                                조합
                                            </th>
                                            <th className="px-4 py-4 text-left text-[14px] font-bold text-gray-700">
                                                관리자
                                            </th>
                                            <th className="px-4 py-4 text-left text-[14px] font-bold text-gray-700">
                                                접근 유형
                                            </th>
                                            <th className="px-4 py-4 text-left text-[14px] font-bold text-gray-700">
                                                IP 주소
                                            </th>
                                            <th className="px-4 py-4 text-left text-[14px] font-bold text-gray-700">
                                                접속 일시
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {logsData?.logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-4 text-[14px] text-gray-900">
                                                    {log.union?.name || '-'}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-400" />
                                                        <span className="text-[14px] font-medium text-gray-900">
                                                            {log.viewer_name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                                                            log.access_type === 'LIST_VIEW' &&
                                                                'bg-blue-100 text-blue-700',
                                                            log.access_type === 'DETAIL_VIEW' &&
                                                                'bg-green-100 text-green-700',
                                                            log.access_type === 'MEMBER_UPDATE' &&
                                                                'bg-yellow-100 text-yellow-700',
                                                            log.access_type === 'MEMBER_BLOCK' &&
                                                                'bg-red-100 text-red-700'
                                                        )}
                                                    >
                                                        {ACCESS_TYPE_LABELS[log.access_type]}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-[14px] text-gray-600 font-mono">
                                                    {log.ip_address || '-'}
                                                </td>
                                                <td className="px-4 py-4 text-[14px] text-gray-600">
                                                    {formatDate(log.accessed_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 페이지네이션 */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                                    <div className="text-[14px] text-gray-600">
                                        총 {logsData?.total}건 중 {(page - 1) * pageSize + 1}-
                                        {Math.min(page * pageSize, logsData?.total || 0)}건
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page === 1}
                                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <span className="text-[14px] text-gray-900 font-medium px-2">
                                            {page} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                                            disabled={page === totalPages}
                                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
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
