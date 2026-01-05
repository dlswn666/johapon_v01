'use client';

import React, { useState, useEffect } from 'react';
import {
    Search,
    Users,
    Loader2,
    AlertTriangle,
    Ban,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useApprovedMembers, MemberWithLandInfo } from '@/app/_lib/features/member-management/api/useMemberHook';
import { useLogAccessEvent } from '@/app/_lib/features/member-management/api/useAccessLogHook';
import useMemberStore, { BlockedFilter } from '@/app/_lib/features/member-management/model/useMemberStore';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import MemberEditModal from './MemberEditModal';
import BlockMemberModal from './BlockMemberModal';

// 면적 포맷 함수 (㎡)
const formatArea = (area: number | null | undefined): string => {
    if (area === null || area === undefined) return '-';
    return `${area.toLocaleString()} ㎡`;
};

// 공시지가 포맷 함수 (원)
const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return '-';
    return `${price.toLocaleString()} 원`;
};

// 차단 필터 버튼 정의
const BLOCKED_FILTER_OPTIONS: { key: BlockedFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'normal', label: '정상 회원' },
    { key: 'blocked', label: '차단 회원' },
];

export default function MemberListTab() {
    const { user } = useAuth();
    const { union } = useSlug();
    const unionId = union?.id;

    // Store 상태
    const { filter, page, pageSize, setFilter, setPage } = useMemberStore();

    // 로컬 상태
    const [searchInput, setSearchInput] = useState(filter.searchQuery);
    const [selectedMember, setSelectedMember] = useState<MemberWithLandInfo | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);

    // API 호출
    const { data, isLoading, refetch } = useApprovedMembers({
        unionId,
        searchQuery: filter.searchQuery,
        blockedFilter: filter.blockedFilter,
        page,
        pageSize,
    });

    // 접속 로그 기록
    const { mutate: logAccessEvent } = useLogAccessEvent();

    // 목록 조회 시 로그 기록 (페이지 변경 시마다)
    useEffect(() => {
        if (unionId && user?.id && user?.name && data?.members && data.members.length > 0) {
            logAccessEvent({
                unionId,
                viewerId: user.id,
                viewerName: user.name,
                accessType: 'LIST_VIEW',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unionId, user?.id, user?.name, page, filter.searchQuery, filter.blockedFilter]);

    const totalPages = Math.ceil((data?.total || 0) / pageSize);

    // 검색 실행
    const handleSearch = () => {
        setFilter({ searchQuery: searchInput });
    };

    // 필터 변경
    const handleBlockedFilterChange = (blockedFilter: BlockedFilter) => {
        setFilter({ blockedFilter });
    };

    // 조합원 클릭 시 상세 모달 열기
    const handleMemberClick = (member: MemberWithLandInfo) => {
        setSelectedMember(member);
        setShowEditModal(true);

        // 상세 조회 로그 기록
        if (unionId && user?.id && user?.name) {
            logAccessEvent({
                unionId,
                viewerId: user.id,
                viewerName: user.name,
                accessType: 'DETAIL_VIEW',
            });
        }
    };

    // 모달 닫기
    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedMember(null);
        refetch();
    };

    // 강제 탈퇴 모달 열기
    const handleOpenBlockModal = (member: MemberWithLandInfo) => {
        setSelectedMember(member);
        setShowBlockModal(true);
    };

    const handleCloseBlockModal = () => {
        setShowBlockModal(false);
        setSelectedMember(null);
        refetch();
    };

    return (
        <div className="space-y-6">
            {/* 검색 및 필터 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* 검색창 */}
                    <div className="flex-1 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearch();
                                    }
                                }}
                                placeholder="이름 또는 물건지 주소로 검색..."
                                className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent text-[16px]"
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            className="h-12 bg-[#4E8C6D] hover:bg-[#3d7058] text-white px-6 rounded-xl"
                        >
                            검색
                        </Button>
                    </div>

                    {/* 차단 상태 필터 */}
                    <div className="flex gap-2">
                        {BLOCKED_FILTER_OPTIONS.map((option) => (
                            <button
                                key={option.key}
                                onClick={() => handleBlockedFilterChange(option.key)}
                                className={cn(
                                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer',
                                    filter.blockedFilter === option.key
                                        ? 'bg-[#4E8C6D] text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 조합원 목록 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden relative min-h-[400px]">
                {/* 헤더 */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#4E8C6D]/10 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-[#4E8C6D]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">조합원 목록</h2>
                            <p className="text-sm text-gray-600">총 {data?.total || 0}명</p>
                        </div>
                    </div>
                </div>

                {/* 로딩 상태 */}
                {isLoading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-[#4E8C6D]" />
                            <p className="text-sm font-medium text-gray-500">데이터를 불러오는 중...</p>
                        </div>
                    </div>
                )}

                {/* 빈 상태 */}
                {!isLoading && (!data?.members || data.members.length === 0) ? (
                    <div className="p-8 text-center text-gray-500 text-[18px]">
                        {filter.searchQuery
                            ? '검색 결과가 없습니다.'
                            : '승인된 조합원이 없습니다.'}
                    </div>
                ) : (
                    <>
                        {/* 테이블 */}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px]">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-4 text-left text-[14px] font-bold text-gray-700 w-16">
                                            번호
                                        </th>
                                        <th className="px-4 py-4 text-left text-[14px] font-bold text-gray-700">
                                            이름
                                        </th>
                                        <th className="px-4 py-4 text-left text-[14px] font-bold text-gray-700">
                                            거주지
                                        </th>
                                        <th className="px-4 py-4 text-left text-[14px] font-bold text-gray-700">
                                            물건지
                                        </th>
                                        <th className="px-4 py-4 text-right text-[14px] font-bold text-gray-700">
                                            면적
                                        </th>
                                        <th className="px-4 py-4 text-right text-[14px] font-bold text-gray-700">
                                            공시지가
                                        </th>
                                        <th className="px-4 py-4 text-left text-[14px] font-bold text-gray-700">
                                            특이사항
                                        </th>
                                        <th className="px-4 py-4 text-center text-[14px] font-bold text-gray-700">
                                            상태
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data?.members.map((member, index) => (
                                        <tr
                                            key={member.id}
                                            className={cn(
                                                'hover:bg-gray-50 cursor-pointer transition-colors',
                                                member.is_blocked && 'bg-red-50/50'
                                            )}
                                            onClick={() => handleMemberClick(member)}
                                        >
                                            <td className="px-4 py-4 text-[14px] text-gray-600">
                                                {(page - 1) * pageSize + index + 1}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[14px] font-medium text-gray-900">
                                                        {member.name}
                                                    </span>
                                                    {!member.isPnuMatched && member.property_pnu && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 w-fit">
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            PNU 미매칭
                                                        </span>
                                                    )}
                                                    {!member.property_pnu && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 w-fit">
                                                            <MapPin className="w-3 h-3 mr-1" />
                                                            PNU 없음
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-[14px] text-gray-600 max-w-[200px]">
                                                <div className="truncate">
                                                    {member.resident_address_road || member.resident_address || '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-[14px] text-gray-600 max-w-[200px]">
                                                <div className="truncate">
                                                    {member.property_address_road || member.property_address || '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-[14px] text-gray-600 text-right whitespace-nowrap">
                                                {formatArea(member.land_lot?.area)}
                                            </td>
                                            <td className="px-4 py-4 text-[14px] text-gray-600 text-right whitespace-nowrap">
                                                {formatPrice(member.land_lot?.official_price)}
                                            </td>
                                            <td className="px-4 py-4 text-[14px] text-gray-600 max-w-[150px]">
                                                <div className="truncate">{member.notes || '-'}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {member.is_blocked ? (
                                                    <span
                                                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"
                                                        title={member.blocked_reason || '차단 사유 없음'}
                                                    >
                                                        <Ban className="w-3 h-3 mr-1" />
                                                        차단됨
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        정상
                                                    </span>
                                                )}
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
                                    총 {data?.total}명 중 {(page - 1) * pageSize + 1}-
                                    {Math.min(page * pageSize, data?.total || 0)}명
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

            {/* 상세/수정 모달 */}
            {showEditModal && selectedMember && (
                <MemberEditModal
                    member={selectedMember}
                    onClose={handleCloseEditModal}
                    onBlock={() => handleOpenBlockModal(selectedMember)}
                />
            )}

            {/* 강제 탈퇴 모달 */}
            {showBlockModal && selectedMember && (
                <BlockMemberModal member={selectedMember} onClose={handleCloseBlockModal} />
            )}
        </div>
    );
}
