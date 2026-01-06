'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Users, AlertTriangle, Ban, CheckCircle, MapPin, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useApprovedMembersInfinite, MemberWithLandInfo } from '@/app/_lib/features/member-management/api/useMemberHook';
import { useLogAccessEvent } from '@/app/_lib/features/member-management/api/useAccessLogHook';
import useMemberStore, { BlockedFilter } from '@/app/_lib/features/member-management/model/useMemberStore';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { OWNERSHIP_TYPE_LABELS, OWNERSHIP_TYPE_STYLES, OwnershipType } from '@/app/_lib/shared/type/database.types';
import MemberEditModal from './MemberEditModal';
import BlockMemberModal from './BlockMemberModal';
import { DataTable, ColumnDef } from '@/app/_lib/widgets/common/data-table';

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
    const { filter, setFilter } = useMemberStore();
    const pageSize = 100; // 무한 스크롤 최적화: 100개씩 조회

    // 로컬 상태
    const [searchInput, setSearchInput] = useState(filter.searchQuery);
    const [selectedMember, setSelectedMember] = useState<MemberWithLandInfo | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);

    // API 호출 (무한 스크롤)
    const {
        data,
        isLoading,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useApprovedMembersInfinite({
        unionId,
        searchQuery: filter.searchQuery,
        blockedFilter: filter.blockedFilter,
        pageSize,
    });

    // 페이지 데이터 평탄화
    const rawMembers = useMemo(() => {
        return data?.pages.flatMap((page) => page.members) || [];
    }, [data?.pages]);

    // 동일인 그룹핑 (이름 + 핸드폰번호 OR 이름 + 거주지가 동일한 경우)
    const members = useMemo(() => {
        if (rawMembers.length === 0) return [];

        // 그룹핑 키 생성 함수
        const getGroupKey = (member: MemberWithLandInfo): string => {
            const name = member.name?.trim() || '';
            const phone = member.phone_number?.replace(/[^0-9]/g, '') || '';
            const resident = member.resident_address?.trim() || '';

            // 핸드폰번호가 있으면 이름+핸드폰으로 그룹핑
            if (phone) {
                return `name_phone:${name}:${phone}`;
            }
            // 거주지가 있으면 이름+거주지로 그룹핑
            if (resident) {
                return `name_resident:${name}:${resident}`;
            }
            // 둘 다 없으면 개별 처리 (id로 유니크하게)
            return `unique:${member.id}`;
        };

        // 그룹별로 멤버 수집
        const groupMap = new Map<string, MemberWithLandInfo[]>();
        rawMembers.forEach((member) => {
            const key = getGroupKey(member);
            if (!groupMap.has(key)) {
                groupMap.set(key, []);
            }
            groupMap.get(key)!.push(member);
        });

        // 그룹핑된 멤버 생성 (대표 멤버만 반환, 추가 물건지 개수 포함)
        const groupedMembers: MemberWithLandInfo[] = [];
        groupMap.forEach((groupMembers) => {
            // 첫 번째 멤버를 대표로 선택
            const representative = { ...groupMembers[0] };
            
            // 그룹 내 모든 사용자의 물건지를 합침
            const allPropertyUnits = groupMembers.flatMap((m) => {
                // 해당 사용자의 물건지 목록 + 해당 사용자의 property_address_jibun을 물건지로 추가
                const units = m.property_units || [];
                return units;
            });

            // 그룹 내 모든 사용자 ID 수집
            const allUserIds = groupMembers.map((m) => m.id);
            
            // 총 물건지 개수 (각 사용자당 최소 1개로 계산)
            const totalPropertyCount = groupMembers.length;

            representative.grouped_user_ids = allUserIds;
            representative.total_property_count = totalPropertyCount;
            representative.property_units = allPropertyUnits;

            groupedMembers.push(representative);
        });

        return groupedMembers;
    }, [rawMembers]);

    const totalCount = data?.pages[0]?.total || 0;
    const groupedCount = members.length;

    // 접속 로그 기록
    const { mutate: logAccessEvent } = useLogAccessEvent();

    // 목록 조회 시 로그 기록 (첫 로드 시)
    useEffect(() => {
        if (unionId && user?.id && user?.name && members.length > 0) {
            logAccessEvent({
                unionId,
                viewerId: user.id,
                viewerName: user.name,
                accessType: 'LIST_VIEW',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unionId, user?.id, user?.name, filter.searchQuery, filter.blockedFilter]);

    // 테이블 컬럼 정의
    const memberColumns: ColumnDef<MemberWithLandInfo>[] = useMemo(
        () => [
            {
                key: 'rowNumber',
                header: '번호',
                width: '60px',
                render: (_, __, index) => index + 1,
            },
            {
                key: 'name',
                header: '이름',
                render: (_, row) => (
                    <div className="flex flex-col gap-1">
                        <span className="text-[14px] font-medium text-gray-900">{row.name}</span>
                        {!row.isPnuMatched && row.property_pnu && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 w-fit">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                PNU 미매칭
                            </span>
                        )}
                        {!row.property_pnu && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 w-fit">
                                <MapPin className="w-3 h-3 mr-1" />
                                PNU 없음
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: 'resident_address',
                header: '거주지',
                className: 'text-gray-600 max-w-[200px]',
                accessor: (row) => row.resident_address_road || row.resident_address || '-',
                render: (value) => <div className="truncate">{value as string}</div>,
            },
            {
                key: 'property_address',
                header: '물건지',
                className: 'text-gray-600 max-w-[250px]',
                render: (_, row) => {
                    const propertyAddress = row.property_address_jibun || row.property_address || '-';
                    const totalCount = row.total_property_count || 1;
                    const hasMultipleProperties = totalCount > 1;

                    return (
                        <div className="flex flex-col gap-1">
                            <div className="truncate">{propertyAddress}</div>
                            {hasMultipleProperties && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 w-fit">
                                    <Home className="w-3 h-3 mr-1" />
                                    +{totalCount - 1}건
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                key: 'area',
                header: '면적',
                align: 'right',
                accessor: (row) => row.land_lot?.area,
                render: (value) => formatArea(value as number | null | undefined),
            },
            {
                key: 'official_price',
                header: '공시지가',
                align: 'right',
                accessor: (row) => row.land_lot?.official_price,
                render: (value) => formatPrice(value as number | null | undefined),
            },
            {
                key: 'ownership_type',
                header: '소유유형',
                align: 'center',
                render: (_, row) => {
                    // 대표 물건지의 소유유형 표시
                    const primaryUnit = row.property_units?.find((pu) => pu.is_primary);
                    const ownershipType = primaryUnit?.ownership_type as OwnershipType | undefined;

                    if (!ownershipType) return <span className="text-gray-400">-</span>;

                    return (
                        <span
                            className={cn(
                                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                OWNERSHIP_TYPE_STYLES[ownershipType]
                            )}
                        >
                            {OWNERSHIP_TYPE_LABELS[ownershipType]}
                            {ownershipType === 'CO_OWNER' && primaryUnit?.ownership_ratio && (
                                <span className="ml-1">({primaryUnit.ownership_ratio}%)</span>
                            )}
                        </span>
                    );
                },
            },
            {
                key: 'notes',
                header: '특이사항',
                className: 'text-gray-600 max-w-[150px]',
                render: (value) => <div className="truncate">{(value as string) || '-'}</div>,
            },
            {
                key: 'is_blocked',
                header: '상태',
                align: 'center',
                render: (value, row) =>
                    value ? (
                        <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"
                            title={row.blocked_reason || '차단 사유 없음'}
                        >
                            <Ban className="w-3 h-3 mr-1" />
                            차단됨
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            정상
                        </span>
                    ),
            },
        ],
        []
    );

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
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* 헤더 */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#4E8C6D]/10 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-[#4E8C6D]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">조합원 목록</h2>
                            <p className="text-sm text-gray-600">
                                총 {totalCount}명 
                                {groupedCount !== rawMembers.length && groupedCount > 0 && (
                                    <span className="text-gray-400 ml-1">
                                        (동일인 그룹핑: {groupedCount}명)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 테이블 */}
                <DataTable<MemberWithLandInfo>
                    data={members}
                    columns={memberColumns}
                    keyExtractor={(row) => row.id}
                    isLoading={isLoading}
                    emptyMessage={filter.searchQuery ? '검색 결과가 없습니다.' : '승인된 조합원이 없습니다.'}
                    emptyIcon={<Users className="w-12 h-12 text-gray-300" />}
                    onRowClick={handleMemberClick}
                    getRowClassName={(row) => (row.is_blocked ? 'bg-red-50/50' : '')}
                    infiniteScroll={{
                        hasNextPage: hasNextPage ?? false,
                        isFetchingNextPage,
                        fetchNextPage,
                        totalItems: totalCount,
                    }}
                    minWidth="900px"
                />
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
