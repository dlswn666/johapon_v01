'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    Upload,
    Download,
    Loader2,
    AlertCircle,
    Users,
    FileSpreadsheet,
    Send,
    Trash2,
    CheckCircle2,
    Clock,
    Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
    useMemberInvites,
    useSyncMemberInvites,
    useDeleteMemberInvite,
} from '@/app/_lib/features/member-invite/api/useMemberInviteHook';
import useMemberInviteStore, { MemberInviteFilter } from '@/app/_lib/features/member-invite/model/useMemberInviteStore';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { MemberInvite } from '@/app/_lib/shared/type/database.types';
import MemberDetailModal from './MemberDetailModal';

interface ExcelMember {
    name: string;
    phone_number: string;
    property_address: string;
}

export default function MemberInvitePage() {
    const { user } = useAuth();
    const { union, isLoading: unionLoading } = useSlug();
    const unionId = union?.id;

    const { isLoading: invitesLoading } = useMemberInvites(unionId);
    const syncMutation = useSyncMemberInvites();
    const deleteMutation = useDeleteMemberInvite();

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Store
    const {
        filter,
        setFilter,
        selectedIds,
        toggleSelect,
        selectAll,
        clearSelection,
        getFilteredInvites,
    } = useMemberInviteStore();

    const filteredInvites = getFilteredInvites();

    // Local state
    const [deleteTarget, setDeleteTarget] = useState<MemberInvite | null>(null);
    const [detailTarget, setDetailTarget] = useState<MemberInvite | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // 엑셀 템플릿 다운로드
    const handleDownloadTemplate = useCallback(() => {
        const templateData = [
            { 이름: '홍길동', 핸드폰번호: '010-1234-5678', 물건지주소: '서울시 강남구 역삼동 123-45' },
            { 이름: '김철수', 핸드폰번호: '010-9876-5432', 물건지주소: '서울시 서초구 서초동 456-78' },
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '예비조합원명부');

        // 컬럼 너비 설정
        worksheet['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 40 }];

        XLSX.writeFile(workbook, '예비조합원_템플릿.xlsx');
        toast.success('템플릿이 다운로드되었습니다.');
    }, []);

    // 엑셀 파일 업로드 핸들러
    const handleFileUpload = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            if (!unionId || !user?.id) {
                toast.error('조합 정보를 불러올 수 없습니다.');
                return;
            }

            setIsUploading(true);

            try {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, string>[];

                // 데이터 변환 및 검증
                const members: ExcelMember[] = [];
                const errors: string[] = [];

                jsonData.forEach((row, index) => {
                    const name = row['이름']?.toString().trim();
                    const phoneNumber = row['핸드폰번호']?.toString().trim();
                    const propertyAddress = row['물건지주소']?.toString().trim();

                    if (!name) {
                        errors.push(`${index + 2}행: 이름이 비어있습니다.`);
                        return;
                    }
                    if (!phoneNumber) {
                        errors.push(`${index + 2}행: 핸드폰번호가 비어있습니다.`);
                        return;
                    }
                    if (!propertyAddress) {
                        errors.push(`${index + 2}행: 물건지주소가 비어있습니다.`);
                        return;
                    }

                    members.push({
                        name,
                        phone_number: phoneNumber,
                        property_address: propertyAddress,
                    });
                });

                if (errors.length > 0) {
                    toast.error(`데이터 오류:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n외 ${errors.length - 5}건` : ''}`);
                    return;
                }

                if (members.length === 0) {
                    toast.error('유효한 데이터가 없습니다.');
                    return;
                }

                // 동기화 실행
                const result = await syncMutation.mutateAsync({
                    unionId,
                    createdBy: user.id,
                    expiresHours: 24 * 365, // 1년
                    members,
                });

                toast.success(
                    `동기화 완료!\n추가: ${result.inserted}명\n삭제(대기): ${result.deleted_pending}명\n삭제(수락): ${result.deleted_used}명`
                );

                clearSelection();
            } catch (error) {
                console.error('Excel upload error:', error);
                toast.error('파일 처리 중 오류가 발생했습니다.');
            } finally {
                setIsUploading(false);
                // 파일 입력 초기화
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        },
        [unionId, user?.id, syncMutation, clearSelection]
    );

    // 삭제 핸들러
    const handleDelete = async () => {
        if (!deleteTarget || !unionId) return;

        try {
            await deleteMutation.mutateAsync({
                inviteId: deleteTarget.id,
                unionId,
            });
            toast.success('삭제되었습니다.');
            setDeleteTarget(null);
        } catch {
            toast.error('삭제에 실패했습니다.');
        }
    };

    // 체크박스 전체 선택 (PENDING만)
    const handleSelectAllPending = () => {
        const pendingIds = filteredInvites
            .filter((invite) => invite.status === 'PENDING')
            .map((invite) => invite.id);
        
        if (selectedIds.length === pendingIds.length) {
            clearSelection();
        } else {
            selectAll(pendingIds);
        }
    };

    // 일괄 초대 (추후 구현)
    const handleBulkInvite = () => {
        toast('카카오톡 알림 기능은 추후 구현 예정입니다.', {
            icon: '🚧',
        });
    };

    // 상태 뱃지
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'USED':
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        수락됨
                    </span>
                );
            case 'EXPIRED':
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        만료됨
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        대기중
                    </span>
                );
        }
    };

    // 필터 버튼
    const filterButtons: { key: MemberInviteFilter; label: string }[] = [
        { key: 'all', label: '전체' },
        { key: 'pending', label: '대기중' },
        { key: 'used', label: '수락됨' },
    ];

    const pendingCount = filteredInvites.filter((i) => i.status === 'PENDING').length;
    const allPendingSelected = pendingCount > 0 && selectedIds.length === pendingCount;

    const isLoading = unionLoading || invitesLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!union) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-lg text-slate-400">조합을 찾을 수 없습니다</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* 페이지 헤더 */}
            <div>
                <h1 className="text-3xl font-bold text-white">조합원 초대 관리</h1>
                <p className="mt-1 text-slate-400">{union.name} 조합의 예비 조합원을 관리합니다</p>
            </div>

            {/* 엑셀 업로드 카드 */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">엑셀 업로드</CardTitle>
                            <CardDescription className="text-slate-400">
                                예비 조합원 명부를 엑셀로 업로드하면 DB와 동기화됩니다
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <Button
                            variant="outline"
                            onClick={handleDownloadTemplate}
                            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            템플릿 다운로드
                        </Button>
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || syncMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isUploading || syncMutation.isPending ? (
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
                    <p className="mt-3 text-xs text-slate-500">
                        * 업로드 시 기존 데이터와 비교하여 자동으로 추가/삭제됩니다. 이미 수락한 조합원도 엑셀에 없으면 삭제됩니다.
                    </p>
                </CardContent>
            </Card>

            {/* 초대 목록 카드 */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <CardTitle className="text-white">초대 목록</CardTitle>
                                <CardDescription className="text-slate-400">
                                    총 {filteredInvites.length}명
                                </CardDescription>
                            </div>
                        </div>
                        {/* 필터 버튼 */}
                        <div className="flex gap-2">
                            {filterButtons.map((btn) => (
                                <Button
                                    key={btn.key}
                                    variant={filter === btn.key ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFilter(btn.key)}
                                    className={
                                        filter === btn.key
                                            ? 'bg-blue-600 hover:bg-blue-700'
                                            : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                                    }
                                >
                                    {btn.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredInvites.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">초대된 조합원이 없습니다</p>
                            <p className="text-sm text-slate-500 mt-1">엑셀 파일을 업로드하여 조합원을 추가하세요</p>
                        </div>
                    ) : (
                        <>
                            {/* 테이블 */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="py-3 px-4 text-left">
                                                <Checkbox
                                                    checked={allPendingSelected}
                                                    onCheckedChange={handleSelectAllPending}
                                                    disabled={pendingCount === 0}
                                                    className="border-slate-600"
                                                />
                                            </th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">
                                                물건지 주소
                                            </th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">
                                                상태
                                            </th>
                                            <th className="py-3 px-4 text-right text-sm font-medium text-slate-400">
                                                관리
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredInvites.map((invite) => (
                                            <tr
                                                key={invite.id}
                                                className="border-b border-slate-700/50 hover:bg-slate-700/30"
                                            >
                                                <td className="py-3 px-4">
                                                    <Checkbox
                                                        checked={selectedIds.includes(invite.id)}
                                                        onCheckedChange={() => toggleSelect(invite.id)}
                                                        disabled={invite.status !== 'PENDING'}
                                                        className="border-slate-600"
                                                    />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => setDetailTarget(invite)}
                                                        className="text-white hover:text-blue-400 transition-colors flex items-center gap-2"
                                                    >
                                                        <Eye className="w-4 h-4 text-slate-500" />
                                                        {invite.property_address}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4">{getStatusBadge(invite.status)}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleteTarget(invite)}
                                                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/20"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 하단 액션 버튼 */}
                            <div className="mt-4 flex justify-between items-center">
                                <p className="text-sm text-slate-400">
                                    {selectedIds.length > 0 && `${selectedIds.length}명 선택됨`}
                                </p>
                                <Button
                                    onClick={handleBulkInvite}
                                    disabled={selectedIds.length === 0}
                                    className="bg-amber-600 hover:bg-amber-700"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    일괄 초대 (추후 구현)
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* 삭제 확인 다이얼로그 */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">초대 삭제</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            이 초대를 삭제하시겠습니까?
                            {deleteTarget?.status === 'USED' && (
                                <span className="block mt-2 text-red-400">
                                    ⚠️ 이미 수락된 초대입니다. 삭제하면 해당 사용자의 가입 정보도 함께 삭제됩니다.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 상세 모달 */}
            <MemberDetailModal
                invite={detailTarget}
                onClose={() => setDetailTarget(null)}
            />
        </div>
    );
}

