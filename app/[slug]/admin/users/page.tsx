'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { User, UserStatus } from '@/app/_lib/shared/type/database.types';
import { cn } from '@/lib/utils';
import {
    Search,
    CheckCircle,
    XCircle,
    User as UserIcon,
    Phone,
    MapPin,
    Calendar,
    Shield,
    Edit,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

interface PostgrestError {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
}

/**
 * 관리자 사용자 관리 페이지
 */
export default function AdminUsersPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { slug, union } = useSlug();
    const { isAdmin, isSystemAdmin } = useAuth();

    // 검색 및 필터 상태
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('ALL');
    const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('ALL');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // 사용자 상세 모달 상태
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [newRole, setNewRole] = useState<string>('');

    // 사용자 목록 조회 - Hook은 항상 호출
    const { data: usersData, isLoading } = useQuery({
        queryKey: ['admin-users', union?.id, statusFilter, roleFilter, searchQuery, page],
        queryFn: async () => {
            let query = supabase
                .from('users')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            // 조합 필터 (시스템 관리자가 아닌 경우)
            if (!isSystemAdmin && union?.id) {
                query = query.eq('union_id', union.id);
            }

            // 상태 필터
            if (statusFilter !== 'ALL') {
                query = query.eq('user_status', statusFilter);
            }

            // 역할 필터
            if (roleFilter !== 'ALL') {
                query = query.eq('role', roleFilter);
            }

            // 검색
            if (searchQuery) {
                query = query.or(
                    `name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%,property_address.ilike.%${searchQuery}%`
                );
            }

            // 페이징
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            return { users: data as User[], total: count || 0 };
        },
        enabled: isAdmin, // 권한이 있을 때만 쿼리 실행
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
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('사용자가 승인되었습니다.');
            setShowDetailModal(false);
            setSelectedUser(null);
        },
        onError: (error: PostgrestError) => {
            toast.error('승인 처리 중 오류가 발생했습니다.');
            console.error('Approve error:', error);
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
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('사용자가 반려되었습니다.');
            setShowDetailModal(false);
            setSelectedUser(null);
            setRejectionReason('');
        },
        onError: (error: PostgrestError) => {
            toast.error('반려 처리 중 오류가 발생했습니다.');
            console.error('Reject error:', error);
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
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('역할이 변경되었습니다.');
        },
        onError: (error: PostgrestError) => {
            toast.error('역할 변경 중 오류가 발생했습니다.');
            console.error('Update role error:', error);
        },
    });

    // 페이지 수 계산
    const totalPages = useMemo(() => {
        if (!usersData?.total) return 1;
        return Math.ceil(usersData.total / pageSize);
    }, [usersData?.total, pageSize]);

    // 사용자 상세 모달 열기
    const openDetailModal = (user: User) => {
        setSelectedUser(user);
        setNewRole(user.role);
        setRejectionReason('');
        setShowDetailModal(true);
    };

    // 권한이 없으면 접근 차단 UI 표시
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                    <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h2>
                    <p className="text-gray-600 mb-6">관리자만 접근할 수 있는 페이지입니다.</p>
                    <button
                        onClick={() => router.push(`/${slug}`)}
                        className="px-6 py-2 bg-[#4E8C6D] text-white rounded-lg hover:bg-[#3d7058] transition-colors"
                    >
                        홈으로 이동
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* 헤더 */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">사용자 관리</h1>
                    <p className="text-gray-600">조합원 가입 신청을 확인하고 승인/반려 처리합니다.</p>
                </div>

                {/* 검색 및 필터 */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* 검색 */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="이름, 전화번호, 물건지로 검색..."
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent"
                            />
                        </div>

                        {/* 상태 필터 */}
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value as UserStatusFilter);
                                setPage(1);
                            }}
                            className="h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent"
                        >
                            <option value="ALL">전체 상태</option>
                            <option value="PENDING_APPROVAL">승인 대기</option>
                            <option value="APPROVED">승인됨</option>
                            <option value="REJECTED">반려됨</option>
                            <option value="PENDING_PROFILE">프로필 미입력</option>
                        </select>

                        {/* 역할 필터 */}
                        <select
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value as UserRoleFilter);
                                setPage(1);
                            }}
                            className="h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent"
                        >
                            <option value="ALL">전체 등급</option>
                            <option value="USER">조합원</option>
                            <option value="ADMIN">조합 관리자</option>
                            <option value="APPLICANT">가입 신청자</option>
                            {isSystemAdmin && <option value="SYSTEM_ADMIN">시스템 관리자</option>}
                        </select>
                    </div>
                </div>

                {/* 사용자 목록 */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">로딩 중...</div>
                    ) : usersData?.users.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">검색 결과가 없습니다.</div>
                    ) : (
                        <>
                            {/* 테이블 */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                                                상태
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                                                이름
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                                                전화번호
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                                                물건지
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                                                등급
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                                                가입일
                                            </th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                                                관리
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {usersData?.users.map((user) => (
                                            <tr
                                                key={user.id}
                                                className={cn(
                                                    'hover:bg-gray-50 cursor-pointer',
                                                    user.user_status === 'PENDING_APPROVAL' &&
                                                        'bg-yellow-50'
                                                )}
                                                onClick={() => openDetailModal(user)}
                                            >
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                                            USER_STATUS_COLORS[user.user_status]
                                                        )}
                                                    >
                                                        {USER_STATUS_LABELS[user.user_status]}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                                    {user.name}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {user.phone_number}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                                                    {user.property_address || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {USER_ROLE_LABELS[user.role] || user.role}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openDetailModal(user);
                                                        }}
                                                        className="p-2 text-gray-500 hover:text-[#4E8C6D] hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 페이지네이션 */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t">
                                    <div className="text-sm text-gray-600">
                                        총 {usersData?.total}명 중 {(page - 1) * pageSize + 1}-
                                        {Math.min(page * pageSize, usersData?.total || 0)}명
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm text-gray-600">
                                            {page} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* 사용자 상세 모달 */}
            {showDetailModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        {/* 모달 헤더 */}
                        <div className="p-6 border-b">
                            <h3 className="text-lg font-bold text-gray-900">사용자 상세 정보</h3>
                        </div>

                        {/* 모달 본문 */}
                        <div className="p-6 space-y-6">
                            {/* 상태 배지 */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">현재 상태</span>
                                <span
                                    className={cn(
                                        'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                                        USER_STATUS_COLORS[selectedUser.user_status]
                                    )}
                                >
                                    {USER_STATUS_LABELS[selectedUser.user_status]}
                                </span>
                            </div>

                            {/* 기본 정보 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <UserIcon className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">이름</p>
                                        <p className="font-medium">{selectedUser.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">전화번호</p>
                                        <p className="font-medium">{selectedUser.phone_number}</p>
                                    </div>
                                </div>
                                {selectedUser.birth_date && (
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-xs text-gray-500">생년월일</p>
                                            <p className="font-medium">{selectedUser.birth_date}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-gray-500">물건지</p>
                                        <p className="font-medium">
                                            {selectedUser.property_address || '-'}
                                            {selectedUser.property_address_detail && (
                                                <span className="text-gray-500">
                                                    {' '}
                                                    {selectedUser.property_address_detail}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 역할 변경 */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">등급</label>
                                <div className="flex gap-2">
                                    <select
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        className="flex-1 h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent"
                                    >
                                        <option value="APPLICANT">가입 신청자</option>
                                        <option value="USER">조합원</option>
                                        <option value="ADMIN">조합 관리자</option>
                                        {isSystemAdmin && (
                                            <option value="SYSTEM_ADMIN">시스템 관리자</option>
                                        )}
                                    </select>
                                    <button
                                        onClick={() =>
                                            updateRoleMutation.mutate({
                                                userId: selectedUser.id,
                                                role: newRole,
                                            })
                                        }
                                        disabled={
                                            newRole === selectedUser.role ||
                                            updateRoleMutation.isPending
                                        }
                                        className="px-4 h-10 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        변경
                                    </button>
                                </div>
                            </div>

                            {/* 반려 사유 (승인 대기 상태일 때만) */}
                            {selectedUser.user_status === 'PENDING_APPROVAL' && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        반려 사유 (반려 시 입력)
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="반려 사유를 입력하세요..."
                                        rows={3}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent resize-none"
                                    />
                                </div>
                            )}

                            {/* 기존 반려 사유 표시 */}
                            {selectedUser.user_status === 'REJECTED' &&
                                selectedUser.rejected_reason && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <p className="text-sm font-medium text-red-800 mb-1">
                                            반려 사유
                                        </p>
                                        <p className="text-sm text-red-700">
                                            {selectedUser.rejected_reason}
                                        </p>
                                    </div>
                                )}
                        </div>

                        {/* 모달 푸터 */}
                        <div className="p-6 border-t bg-gray-50 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setSelectedUser(null);
                                }}
                                className="flex-1 h-10 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                닫기
                            </button>

                            {selectedUser.user_status === 'PENDING_APPROVAL' && (
                                <>
                                    <button
                                        onClick={() =>
                                            rejectMutation.mutate({
                                                userId: selectedUser.id,
                                                reason: rejectionReason || '관리자에 의해 반려되었습니다.',
                                            })
                                        }
                                        disabled={rejectMutation.isPending}
                                        className="flex-1 h-10 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        <span>반려</span>
                                    </button>
                                    <button
                                        onClick={() => approveMutation.mutate(selectedUser.id)}
                                        disabled={approveMutation.isPending}
                                        className="flex-1 h-10 rounded-lg bg-[#4E8C6D] text-white hover:bg-[#3d7058] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        <span>승인</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
