'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
    UserCheck,
    UserPlus,
    Search,
    CheckCircle,
    XCircle,
    User as UserIcon,
    Phone,
    MapPin,
    Calendar,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
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
    useSendBulkMemberAlimtalk,
    useCreateManualInvites,
} from '@/app/_lib/features/member-invite/api/useMemberInviteHook';
import useMemberInviteStore, { MemberInviteFilter } from '@/app/_lib/features/member-invite/model/useMemberInviteStore';
import { sendAlimTalk } from '@/app/_lib/features/alimtalk/actions/sendAlimTalk';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { MemberInvite, User, UserStatus } from '@/app/_lib/shared/type/database.types';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MemberDetailModal from './MemberDetailModal';
import ManualInviteModal from './ManualInviteModal';
import { cn } from '@/lib/utils';
import { SelectBox } from '@/app/_lib/widgets/common/select-box';

// 탭 타입
type TabType = 'invite' | 'approval';

// 사용자 상태 필터 타입
type UserStatusFilter = 'ALL' | UserStatus;
type UserRoleFilter = 'ALL' | 'SYSTEM_ADMIN' | 'ADMIN' | 'USER' | 'APPLICANT';

const USER_STATUS_LABELS: Record<UserStatus, string> = {
    PENDING_PROFILE: '프로필 미입력',
    PENDING_APPROVAL: '승인 대기',
    APPROVED: '승인됨',
    REJECTED: '반려됨',
};

const USER_STATUS_COLORS: Record<UserStatus, string> = {
    PENDING_PROFILE: 'bg-gray-100 text-gray-700',
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
};

const USER_ROLE_LABELS: Record<string, string> = {
    SYSTEM_ADMIN: '시스템 관리자',
    ADMIN: '조합 관리자',
    USER: '조합원',
    APPLICANT: '가입 신청자',
};

// 전화번호 마스킹 함수 (뒤 3자리를 ***로 표시)
const maskPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone || phone.length < 4) return phone || '-';
    return phone.slice(0, -3) + '***';
};

interface ExcelMember {
    name: string;
    phone_number: string;
}

export default function MemberManagementPage() {
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { user, isAdmin, isSystemAdmin } = useAuth();
    const { union, isLoading: unionLoading } = useSlug();
    const unionId = union?.id;

    // 탭 상태 (URL 파라미터로부터 초기화)
    const initialTab = (searchParams.get('tab') as TabType) || 'invite';
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    // URL 파라미터 변경 감지
    useEffect(() => {
        const tab = searchParams.get('tab') as TabType;
        if (tab === 'approval' || tab === 'invite') {
            setActiveTab(tab);
        }
    }, [searchParams]);

    // ====== 초대 관리 관련 상태 ======
    const { isLoading: invitesLoading } = useMemberInvites(unionId);
    const syncMutation = useSyncMemberInvites();
    const deleteMutation = useDeleteMemberInvite();
    const { mutateAsync: sendBulkAlimtalk, isPending: isSendingAlimtalk } = useSendBulkMemberAlimtalk();

    // 수동 회원 등록 훅
    const { mutateAsync: createManualInvites, isPending: isCreatingManual } = useCreateManualInvites();

    // 알림톡 발송 확인 다이얼로그 상태
    const [showAlimtalkConfirm, setShowAlimtalkConfirm] = useState(false);
    // 수동 회원 등록 모달 상태
    const [showManualInviteModal, setShowManualInviteModal] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const { filter, setFilter, selectedIds, toggleSelect, selectAll, clearSelection, getFilteredInvites } =
        useMemberInviteStore();

    const filteredInvites = getFilteredInvites();

    const [deleteTarget, setDeleteTarget] = useState<MemberInvite | null>(null);
    const [detailTarget, setDetailTarget] = useState<MemberInvite | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // ====== 승인 관리 관련 상태 ======
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('ALL');
    const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('ALL');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [newRole, setNewRole] = useState<string>('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    // 사용자 목록 조회
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ['admin-users', union?.id, statusFilter, roleFilter, searchQuery, page],
        queryFn: async () => {
            let query = supabase
                .from('users')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (union?.id) {
                query = query.eq('union_id', union.id);
            }

            if (statusFilter !== 'ALL') {
                query = query.eq('user_status', statusFilter);
            }

            if (roleFilter !== 'ALL') {
                query = query.eq('role', roleFilter);
            }

            if (searchQuery) {
                query = query.or(
                    `name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%,property_address.ilike.%${searchQuery}%`
                );
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            return { users: data as User[], total: count || 0 };
        },
        enabled: isAdmin && activeTab === 'approval',
    });

    // 사용자 승인 mutation
    const approveMutation = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase
                .from('users')
                .update({
                    user_status: 'APPROVED',
                    role: 'USER',
                    approved_at: new Date().toISOString(),
                    rejected_reason: null,
                    rejected_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users', unionId] });
            queryClient.refetchQueries({ queryKey: ['admin-users', unionId] });
            toast.success('사용자가 승인되었습니다.');
            setShowDetailModal(false);
            setSelectedUser(null);

            // 승인 안내 알림톡 발송
            if (selectedUser) {
                sendAlimTalk({
                    unionId: unionId!,
                    templateCode: 'UE_3602', // 승인 템플릿 코드
                    recipients: [{
                        phoneNumber: selectedUser.phone_number,
                        name: selectedUser.name,
                        variables: {
                            조합명: union?.name || '',
                            이름: selectedUser.name
                        }
                    }]
                });
            }
        },
        onError: () => {
            toast.error('승인 처리 중 오류가 발생했습니다.');
        },
    });

    // 사용자 반려 mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
            const { error } = await supabase
                .from('users')
                .update({
                    user_status: 'REJECTED',
                    rejected_reason: reason,
                    rejected_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users', unionId] });
            queryClient.refetchQueries({ queryKey: ['admin-users', unionId] });
            toast.success('사용자가 반려되었습니다.');
            setShowDetailModal(false);
            setSelectedUser(null);
            setRejectionReason('');

            // 반려 안내 알림톡 발송
            if (selectedUser) {
                sendAlimTalk({
                    unionId: unionId!,
                    templateCode: 'UE_3603', // 반려 템플릿 코드
                    recipients: [{
                        phoneNumber: selectedUser.phone_number,
                        name: selectedUser.name,
                        variables: {
                            조합명: union?.name || '',
                            이름: selectedUser.name,
                            사유: rejectionReason
                        }
                    }]
                });
            }
        },
        onError: () => {
            toast.error('반려 처리 중 오류가 발생했습니다.');
        },
    });

    // 역할 변경 mutation
    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
            const { error } = await supabase
                .from('users')
                .update({
                    role,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users', unionId] });
            queryClient.refetchQueries({ queryKey: ['admin-users', unionId] });
            toast.success('역할이 변경되었습니다.');
        },
        onError: () => {
            toast.error('역할 변경 중 오류가 발생했습니다.');
        },
    });

    // 반려 취소 mutation (REJECTED → PENDING_APPROVAL)
    const cancelRejectionMutation = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase
                .from('users')
                .update({
                    user_status: 'PENDING_APPROVAL',
                    rejected_reason: null,
                    rejected_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users', unionId] });
            queryClient.refetchQueries({ queryKey: ['admin-users', unionId] });
            toast.success('반려가 취소되었습니다. 다시 승인 대기 상태입니다.');
            setShowDetailModal(false);
            setSelectedUser(null);
        },
        onError: () => {
            toast.error('반려 취소 중 오류가 발생했습니다.');
        },
    });

    // 페이지 수 계산
    const totalPages = useMemo(() => {
        if (!usersData?.total) return 1;
        return Math.ceil(usersData.total / pageSize);
    }, [usersData?.total, pageSize]);

    // 사용자 상세 모달 열기
    const openUserDetailModal = (user: User) => {
        setSelectedUser(user);
        setNewRole(user.role);
        setRejectionReason('');
        setShowDetailModal(true);
    };

    // ====== 초대 관리 핸들러 ======
    const handleDownloadTemplate = useCallback(() => {
        const templateData = [
            { 이름: '홍길동', 핸드폰번호: '010-1234-5678' },
            { 이름: '김철수', 핸드폰번호: '010-9876-5432' },
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '예비조합원명부');

        // 컬럼 너비 설정
        worksheet['!cols'] = [{ wch: 15 }, { wch: 20 }];

        // 핸드폰번호 컬럼을 텍스트 형식으로 설정 (0으로 시작하는 숫자 유지)
        // B2, B3 셀에 텍스트 형식 적용
        if (worksheet['B2']) worksheet['B2'].t = 's';
        if (worksheet['B3']) worksheet['B3'].t = 's';

        XLSX.writeFile(workbook, '예비조합원_템플릿.xlsx');
        toast.success('템플릿이 다운로드되었습니다.');
    }, []);

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

                const members: ExcelMember[] = [];
                const errors: string[] = [];

                jsonData.forEach((row, index) => {
                    const name = row['이름']?.toString().trim();
                    // 핸드폰번호 처리: 하이픈 제거 및 숫자만 추출
                    let phoneNumber = row['핸드폰번호']?.toString().trim() || '';
                    phoneNumber = phoneNumber.replace(/[^\d]/g, ''); // 숫자만 추출

                    if (!name) {
                        errors.push(`${index + 2}행: 이름이 비어있습니다.`);
                        return;
                    }
                    if (!phoneNumber || phoneNumber.length < 10) {
                        errors.push(`${index + 2}행: 핸드폰번호가 올바르지 않습니다.`);
                        return;
                    }

                    members.push({
                        name,
                        phone_number: phoneNumber,
                    });
                });

                if (errors.length > 0) {
                    toast.error(
                        `데이터 오류:\n${errors.slice(0, 5).join('\n')}${
                            errors.length > 5 ? `\n외 ${errors.length - 5}건` : ''
                        }`
                    );
                    return;
                }

                if (members.length === 0) {
                    toast.error('유효한 데이터가 없습니다.');
                    return;
                }

                const result = await syncMutation.mutateAsync({
                    unionId,
                    createdBy: user.id,
                    expiresHours: 24 * 365,
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
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        },
        [unionId, user?.id, syncMutation, clearSelection]
    );

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

    const handleSelectAllPending = () => {
        const pendingIds = filteredInvites.filter((invite) => invite.status === 'PENDING').map((invite) => invite.id);

        if (selectedIds.length === pendingIds.length) {
            clearSelection();
        } else {
            selectAll(pendingIds);
        }
    };

    const handleBulkInvite = () => {
        if (selectedIds.length === 0) {
            toast.error('발송할 대상을 선택해주세요.');
            return;
        }
        setShowAlimtalkConfirm(true);
    };

    const handleConfirmBulkInvite = async () => {
        if (!unionId || !union) return;

        setShowAlimtalkConfirm(false);

        try {
            // 도메인 추출 (현재 호스트에서)
            const domain = typeof window !== 'undefined' ? window.location.host : 'johapon.kr';

            const result = await sendBulkAlimtalk({
                unionId,
                unionName: union.name,
                unionSlug: union.slug,
                domain,
                inviteIds: selectedIds,
            });

            if (result.success) {
                toast.success(
                    `알림톡 발송 완료!\n카카오톡: ${result.kakaoCount || 0}건\n대체문자: ${result.smsCount || 0}건${
                        result.failCount ? `\n실패: ${result.failCount}건` : ''
                    }`,
                    { duration: 5000 }
                );
                clearSelection();
            } else {
                toast.error(result.error || '알림톡 발송에 실패했습니다.');
            }
        } catch (error) {
            console.error('알림톡 발송 오류:', error);
            toast.error(error instanceof Error ? error.message : '알림톡 발송에 실패했습니다.');
        }
    };

    // 수동 회원 등록 핸들러
    const handleManualInvite = async (members: { name: string; phone_number: string; property_address: string }[]) => {
        if (!unionId || !union || !user?.id) {
            toast.error('조합 정보를 불러올 수 없습니다.');
            return;
        }

        try {
            const domain = typeof window !== 'undefined' ? window.location.host : 'johapon.kr';

            const result = await createManualInvites({
                unionId,
                unionName: union.name,
                unionSlug: union.slug,
                domain,
                createdBy: user.id,
                members,
            });

            if (result.alimtalkResult.success) {
                toast.success(
                    `등록 완료! ${result.insertedCount}명\n알림톡 발송: ${result.alimtalkResult.sentCount || 0}건`,
                    { duration: 5000 }
                );
                setShowManualInviteModal(false);
            } else {
                toast.error(result.alimtalkResult.error || '알림톡 발송에 실패했습니다.');
            }
        } catch (error) {
            console.error('수동 회원 등록 오류:', error);
            toast.error(error instanceof Error ? error.message : '회원 등록에 실패했습니다.');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'USED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        수락됨
                    </span>
                );
            case 'EXPIRED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <Clock className="w-3 h-3 mr-1" />
                        만료됨
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        <Send className="w-3 h-3 mr-1" />
                        발송완료
                    </span>
                );
        }
    };

    const filterButtons: { key: MemberInviteFilter; label: string }[] = [
        { key: 'all', label: '전체' },
        { key: 'pending', label: '발송완료' },
        { key: 'used', label: '수락됨' },
    ];

    const pendingCount = filteredInvites.filter((i) => i.status === 'PENDING').length;
    const allPendingSelected = pendingCount > 0 && selectedIds.length === pendingCount;

    if (!union && !unionLoading) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600">조합을 찾을 수 없습니다</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* 페이지 헤더 */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">조합원 관리</h1>
                    <p className="text-gray-600">{union?.name} 조합의 조합원을 관리합니다</p>
                </div>

                {/* 탭 네비게이션 */}
                <div className="bg-white rounded-xl shadow-sm">
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px">
                            <button
                                onClick={() => setActiveTab('invite')}
                                className={cn(
                                    'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors cursor-pointer',
                                    activeTab === 'invite'
                                        ? 'border-[#4E8C6D] text-[#4E8C6D]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                )}
                            >
                                <UserPlus className="w-4 h-4" />
                                초대 관리
                            </button>
                            <button
                                onClick={() => setActiveTab('approval')}
                                className={cn(
                                    'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors cursor-pointer',
                                    activeTab === 'approval'
                                        ? 'border-[#4E8C6D] text-[#4E8C6D]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                )}
                            >
                                <UserCheck className="w-4 h-4" />
                                승인 관리
                            </button>
                        </nav>
                    </div>
                </div>

                {/* 탭 컨텐츠 */}
                {activeTab === 'invite' ? (
                    // ====== 초대 관리 탭 ======
                    <>
                        {/* 엑셀 업로드 카드 */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#4E8C6D]/10 rounded-xl flex items-center justify-center">
                                        <FileSpreadsheet className="w-5 h-5 text-[#4E8C6D]" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">회원 등록</h2>
                                        <p className="text-sm text-gray-600">
                                            엑셀 업로드 또는 수동 등록으로 예비 조합원을 추가합니다
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => setShowManualInviteModal(true)}
                                    className="bg-[#4E8C6D] hover:bg-[#3d7058] text-white"
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    수동 등록
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadTemplate}
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    템플릿 다운로드
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading || syncMutation.isPending}
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
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
                            <p className="mt-3 text-xs text-gray-500">
                                * 엑셀 업로드 시 기존 데이터와 비교하여 자동으로 추가/삭제됩니다.
                            </p>
                        </div>

                        {/* 초대 목록 카드 */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#4E8C6D]/10 rounded-xl flex items-center justify-center">
                                            <Users className="w-5 h-5 text-[#4E8C6D]" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">초대 목록</h2>
                                            <p className="text-sm text-gray-600">총 {filteredInvites.length}명</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {filterButtons.map((btn) => (
                                            <button
                                                key={btn.key}
                                                onClick={() => setFilter(btn.key)}
                                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                                                    filter === btn.key
                                                        ? 'bg-[#4E8C6D] text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                {btn.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 relative min-h-[300px]">
                                {invitesLoading && (
                                    <div className="absolute inset-x-6 top-6 bottom-6 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-8 h-8 animate-spin text-[#4E8C6D]" />
                                            <p className="text-sm font-medium text-gray-500">데이터를 불러오는 중...</p>
                                        </div>
                                    </div>
                                )}
                                {filteredInvites.length === 0 && !invitesLoading ? (
                                    <div className="text-center py-12">
                                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-600">초대된 조합원이 없습니다</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            엑셀 파일을 업로드하여 조합원을 추가하세요
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b">
                                                    <tr>
                                                        <th className="py-3 px-4 text-left">
                                                            <Checkbox
                                                                checked={allPendingSelected}
                                                                onCheckedChange={handleSelectAllPending}
                                                                disabled={pendingCount === 0}
                                                                className="border-gray-300"
                                                            />
                                                        </th>
                                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
                                                            이름
                                                        </th>
                                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
                                                            핸드폰번호
                                                        </th>
                                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
                                                            상태
                                                        </th>
                                                        <th className="py-3 px-4 text-center text-sm font-medium text-gray-700">
                                                            관리
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredInvites.map((invite) => (
                                                        <tr key={invite.id} className="hover:bg-gray-50">
                                                            <td className="py-3 px-4">
                                                                <Checkbox
                                                                    checked={selectedIds.includes(invite.id)}
                                                                    onCheckedChange={() => toggleSelect(invite.id)}
                                                                    disabled={invite.status !== 'PENDING'}
                                                                    className="border-gray-300"
                                                                />
                                                            </td>
                                                            <td className="py-3 px-4 text-sm text-gray-900">
                                                                {invite.name}
                                                            </td>
                                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                                {maskPhoneNumber(invite.phone_number)}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                {getStatusBadge(invite.status)}
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                <button
                                                                    onClick={() => setDeleteTarget(invite)}
                                                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="mt-4 flex justify-between items-center border-t pt-4">
                                            <div className="text-sm text-gray-600">
                                                {selectedIds.length > 0 && `${selectedIds.length}명 선택됨`}
                                            </div>
                                            <Button
                                                onClick={handleBulkInvite}
                                                disabled={selectedIds.length === 0 || isSendingAlimtalk}
                                                className="bg-[#4E8C6D] hover:bg-[#3d7058] text-white"
                                            >
                                                {isSendingAlimtalk ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4 mr-2" />
                                                )}
                                                {isSendingAlimtalk ? '발송 중...' : '알림톡 일괄 발송'}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    // ====== 승인 관리 탭 ======
                    <>
                        {/* 검색 및 필터 */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setSearchQuery(searchInput);
                                                    setPage(1);
                                                }
                                            }}
                                            placeholder="이름, 전화번호, 물건지로 검색..."
                                            className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent text-[16px]"
                                        />
                                    </div>
                                    <Button
                                        onClick={() => {
                                            setSearchQuery(searchInput);
                                            setPage(1);
                                        }}
                                        className="h-12 bg-[#4E8C6D] hover:bg-[#3d7058] text-white px-6 rounded-xl"
                                    >
                                        검색
                                    </Button>
                                </div>

                                <SelectBox
                                    value={statusFilter}
                                    onChange={(value) => {
                                        setStatusFilter(value as UserStatusFilter);
                                        setPage(1);
                                    }}
                                    options={[
                                        { value: 'ALL', label: '전체 상태' },
                                        { value: 'PENDING_APPROVAL', label: '승인 대기' },
                                        { value: 'APPROVED', label: '승인됨' },
                                        { value: 'REJECTED', label: '반려됨' },
                                        { value: 'PENDING_PROFILE', label: '프로필 미입력' },
                                    ]}
                                    className="min-w-[140px]"
                                />

                                <SelectBox
                                    value={roleFilter}
                                    onChange={(value) => {
                                        setRoleFilter(value as UserRoleFilter);
                                        setPage(1);
                                    }}
                                    options={[
                                        { value: 'ALL', label: '전체 등급' },
                                        { value: 'USER', label: '조합원' },
                                        { value: 'ADMIN', label: '조합 관리자' },
                                        { value: 'APPLICANT', label: '가입 신청자' },
                                        ...(isSystemAdmin ? [{ value: 'SYSTEM_ADMIN', label: '시스템 관리자' }] : []),
                                    ]}
                                    className="min-w-[140px]"
                                />
                            </div>
                        </div>

                        {/* 사용자 목록 */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden relative min-h-[300px]">
                            {usersLoading && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 animate-spin text-[#4E8C6D]" />
                                        <p className="text-sm font-medium text-gray-500">데이터를 불러오는 중...</p>
                                    </div>
                                </div>
                            )}
                            {usersData?.users.length === 0 && !usersLoading ? (
                                <div className="p-8 text-center text-gray-500 text-[18px]">검색 결과가 없습니다.</div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[800px]">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[14px] font-bold text-gray-700">
                                                        상태
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-[14px] font-bold text-gray-700">
                                                        이름
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-[14px] font-bold text-gray-700">
                                                        전화번호
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-[14px] font-bold text-gray-700">
                                                        물건지
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-[14px] font-bold text-gray-700">
                                                        등급
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-[14px] font-bold text-gray-700">
                                                        가입일
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {usersData?.users.map((userData) => (
                                                    <tr
                                                        key={userData.id}
                                                        className={cn(
                                                            'hover:bg-gray-50 cursor-pointer transition-colors',
                                                            userData.user_status === 'PENDING_APPROVAL' &&
                                                                'bg-yellow-50/50'
                                                        )}
                                                        onClick={() => openUserDetailModal(userData)}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span
                                                                className={cn(
                                                                    'inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium',
                                                                    USER_STATUS_COLORS[userData.user_status]
                                                                )}
                                                            >
                                                                {USER_STATUS_LABELS[userData.user_status]}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-[14px] text-gray-900 font-medium whitespace-nowrap">
                                                            {userData.name}
                                                        </td>
                                                        <td className="px-6 py-4 text-[14px] text-gray-600  whitespace-nowrap">
                                                            {maskPhoneNumber(userData.phone_number)}
                                                        </td>
                                                        <td className="px-6 py-4 text-[14px] text-gray-600">
                                                            <div>{userData.property_address_road || '-'}</div>
                                                            {userData.property_address_jibun && (
                                                                <div className="text-[12px] text-gray-400 mt-1">
                                                                    (지번) {userData.property_address_jibun}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-[14px] text-gray-600 whitespace-nowrap">
                                                            {USER_ROLE_LABELS[userData.role] || userData.role}
                                                        </td>
                                                        <td className="px-6 py-4 text-[14px] text-gray-600 whitespace-nowrap">
                                                            {new Date(userData.created_at).toLocaleDateString('ko-KR')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                                            <div className="text-[14px] text-gray-600">
                                                총 {usersData?.total}명 중 {(page - 1) * pageSize + 1}-
                                                {Math.min(page * pageSize, usersData?.total || 0)}명
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                                    disabled={page === 1}
                                                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                                >
                                                    <ChevronLeft className="w-5 h-5" />
                                                </button>
                                                <span className="text-[14px] text-gray-900 font-medium px-2">
                                                    {page} / {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
                    </>
                )}

                {/* 초대 삭제 확인 다이얼로그 */}
                <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                    <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-gray-900">초대 삭제</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600">
                                이 초대를 삭제하시겠습니까?
                                {deleteTarget?.status === 'USED' && (
                                    <span className="block mt-2 text-red-600">
                                        ⚠️ 이미 수락된 초대입니다. 삭제하면 해당 사용자의 가입 정보도 함께 삭제됩니다.
                                    </span>
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">
                                취소
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-red-500 hover:bg-red-600 text-white"
                            >
                                삭제
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* 알림톡 발송 확인 다이얼로그 */}
                <AlertDialog open={showAlimtalkConfirm} onOpenChange={setShowAlimtalkConfirm}>
                    <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-gray-900 flex items-center gap-2">
                                <Send className="w-5 h-5 text-[#4E8C6D]" />
                                알림톡 일괄 발송
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600">
                                <span className="font-semibold text-[#4E8C6D]">{selectedIds.length}명</span>의
                                조합원에게 본인 확인 안내 알림톡을 발송합니다.
                                <br />
                                <span className="text-sm text-gray-500 mt-2 block">
                                    * 카카오톡 발송 실패 시 대체 문자로 자동 발송됩니다.
                                    <br />* 발송 비용이 발생합니다. (약 {selectedIds.length * 15}원 예상)
                                </span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">
                                취소
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleConfirmBulkInvite}
                                className="bg-[#4E8C6D] hover:bg-[#3d7058] text-white"
                            >
                                발송하기
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* 초대 상세 모달 */}
                <MemberDetailModal invite={detailTarget} onClose={() => setDetailTarget(null)} />

                {/* 수동 회원 등록 모달 */}
                <ManualInviteModal
                    isOpen={showManualInviteModal}
                    onClose={() => setShowManualInviteModal(false)}
                    onSubmit={handleManualInvite}
                    isSubmitting={isCreatingManual}
                />

                {/* 사용자 상세 모달 */}
                {showDetailModal && selectedUser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="text-[20px] font-bold text-gray-900">사용자 상세 정보</h3>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[14px] text-gray-500">현재 상태</span>
                                    <span
                                        className={cn(
                                            'inline-flex items-center px-4 py-1.5 rounded-full text-[14px] font-medium',
                                            USER_STATUS_COLORS[selectedUser.user_status]
                                        )}
                                    >
                                        {USER_STATUS_LABELS[selectedUser.user_status]}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                        <UserIcon className="w-6 h-6 text-gray-400" />
                                        <div>
                                            <p className="text-[12px] text-gray-500">이름</p>
                                            <p className="text-[16px] font-bold text-gray-900">{selectedUser.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                        <Phone className="w-6 h-6 text-gray-400" />
                                        <div>
                                            <p className="text-[12px] text-gray-500">전화번호</p>
                                            <p className="text-[16px] font-bold text-gray-900">
                                                {selectedUser.phone_number}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedUser.birth_date && (
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                            <Calendar className="w-6 h-6 text-gray-400" />
                                            <div>
                                                <p className="text-[12px] text-gray-500">생년월일</p>
                                                <p className="text-[16px] font-bold text-gray-900">
                                                    {selectedUser.birth_date}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                        <MapPin className="w-6 h-6 text-gray-400 mt-1" />
                                        <div className="flex-1">
                                            <p className="text-[12px] text-gray-500">물건지</p>
                                            <div className="text-[16px] font-bold text-gray-900">
                                                <div>{selectedUser.property_address_road || '-'}</div>
                                                {selectedUser.property_address_jibun && (
                                                    <div className="text-[14px] font-normal text-gray-500 mt-1">
                                                        <span className="text-[12px] bg-gray-200 px-1 rounded mr-1">지번</span>
                                                        {selectedUser.property_address_jibun}
                                                    </div>
                                                )}
                                                {selectedUser.property_address_detail && (
                                                    <div className="text-gray-600 font-normal mt-1 border-t border-gray-200 pt-1">
                                                        {selectedUser.property_address_detail}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[14px] font-medium text-gray-700">등급</label>
                                    <div className="flex gap-2">
                                        <SelectBox
                                            value={newRole}
                                            onChange={(value) => setNewRole(value)}
                                            options={[
                                                { value: 'USER', label: '조합원' },
                                                { value: 'ADMIN', label: '조합 관리자' },
                                                ...(isSystemAdmin
                                                    ? [{ value: 'SYSTEM_ADMIN', label: '시스템 관리자' }]
                                                    : []),
                                            ]}
                                            className="flex-1"
                                        />
                                        <button
                                            onClick={() =>
                                                updateRoleMutation.mutate({
                                                    userId: selectedUser.id,
                                                    role: newRole,
                                                })
                                            }
                                            disabled={newRole === selectedUser.role || updateRoleMutation.isPending}
                                            className="px-6 h-12 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[14px] font-medium cursor-pointer"
                                        >
                                            변경
                                        </button>
                                    </div>
                                </div>

                                {selectedUser.user_status === 'REJECTED' && selectedUser.rejected_reason && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                                        <p className="text-[14px] font-bold text-red-800 mb-2">반려 사유</p>
                                        <p className="text-[14px] text-red-700 leading-relaxed">
                                            {selectedUser.rejected_reason}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
                                <button
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        setSelectedUser(null);
                                    }}
                                    className="flex-1 h-12 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors text-[14px] font-medium cursor-pointer"
                                >
                                    닫기
                                </button>

                                {(selectedUser.user_status === 'PENDING_APPROVAL' || selectedUser.user_status === 'APPROVED') && (
                                    <>
                                        <button
                                            onClick={() => setShowRejectModal(true)}
                                            disabled={rejectMutation.isPending}
                                            className="flex-1 h-12 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-[14px] font-medium cursor-pointer"
                                        >
                                            <XCircle className="w-5 h-5" />
                                            <span>반려</span>
                                        </button>
                                        {selectedUser.user_status === 'PENDING_APPROVAL' && (
                                            <button
                                                onClick={() => approveMutation.mutate(selectedUser.id)}
                                                disabled={approveMutation.isPending}
                                                className="flex-1 h-12 rounded-xl bg-[#4E8C6D] text-white hover:bg-[#3d7058] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-[14px] font-medium cursor-pointer"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                                <span>승인</span>
                                            </button>
                                        )}
                                    </>
                                )}

                                {selectedUser.user_status === 'REJECTED' && (
                                    <button
                                        onClick={() => cancelRejectionMutation.mutate(selectedUser.id)}
                                        disabled={cancelRejectionMutation.isPending}
                                        className="flex-1 h-12 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-[14px] font-medium cursor-pointer"
                                    >
                                        {cancelRejectionMutation.isPending ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Clock className="w-5 h-5" />
                                        )}
                                        <span>반려 취소</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 반려 사유 입력 모달 */}
                {showRejectModal && selectedUser && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="text-[18px] font-bold text-gray-900">반려 사유 입력</h3>
                                <p className="text-[14px] text-gray-500 mt-1">
                                    {selectedUser.name}님의 가입 신청을 반려합니다.
                                </p>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-[14px] font-medium text-gray-700">
                                        반려 사유 <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="반려 사유를 입력하세요..."
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-[14px]"
                                    />
                                    {rejectionReason.trim().length === 0 && (
                                        <p className="text-[12px] text-red-500">
                                            반려 사유를 입력해야 반려할 수 있습니다.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
                                <button
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setRejectionReason('');
                                    }}
                                    className="flex-1 h-12 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors text-[14px] font-medium cursor-pointer"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={() => {
                                        rejectMutation.mutate({
                                            userId: selectedUser.id,
                                            reason: rejectionReason,
                                        });
                                        setShowRejectModal(false);
                                    }}
                                    disabled={rejectionReason.trim().length === 0 || rejectMutation.isPending}
                                    className="flex-1 h-12 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[14px] font-medium cursor-pointer"
                                >
                                    {rejectMutation.isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <XCircle className="w-5 h-5" />
                                    )}
                                    <span>반려 확인</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
