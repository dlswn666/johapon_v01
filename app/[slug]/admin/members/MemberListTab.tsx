'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Users, AlertTriangle, MapPin, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    useApprovedMembersInfinite,
    MemberWithLandInfo,
} from '@/app/_lib/features/member-management/api/useMemberHook';
import { useLogAccessEvent } from '@/app/_lib/features/member-management/api/useAccessLogHook';
import useMemberStore, { BlockedFilter } from '@/app/_lib/features/member-management/model/useMemberStore';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { OWNERSHIP_TYPE_LABELS, OWNERSHIP_TYPE_STYLES, OwnershipType } from '@/app/_lib/shared/type/database.types';
import MemberEditModal from './MemberEditModal';
import BlockMemberModal from './BlockMemberModal';
import { DataTable, ColumnDef } from '@/app/_lib/widgets/common/data-table';

// 이름 말줄임 처리 함수 (8자 초과 시 ...)
const truncateName = (name: string | null | undefined, maxLength: number = 8): string => {
    if (!name) return '-';
    if (name.length <= maxLength) return name;
    return `${name.slice(0, maxLength)}...`;
};

// 면적 포맷 함수 (㎡)
const formatArea = (area: number | null | undefined): string => {
    if (area === null || area === undefined) return '-';
    return `${Number(area).toLocaleString()} ㎡`;
};

// 공시지가 단가 포맷 함수 (원/㎡)
const formatUnitPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return '-';
    return `${Number(price).toLocaleString()} 원/㎡`;
};

// 공시지가 총액 계산 및 포맷 함수
const formatTotalPrice = (area: number | null | undefined, unitPrice: number | null | undefined): string => {
    if (area === null || area === undefined || unitPrice === null || unitPrice === undefined) return '-';
    const total = Number(area) * Number(unitPrice);
    // 억 단위 이상이면 억으로 표시
    if (total >= 100000000) {
        return `${(total / 100000000).toFixed(1)}억원`;
    }
    // 만 단위 이상이면 만으로 표시
    if (total >= 10000) {
        return `${Math.round(total / 10000).toLocaleString()}만원`;
    }
    return `${total.toLocaleString()}원`;
};

// 지분율 포맷 함수 (%)
const formatRatio = (ratio: number | null | undefined): string => {
    if (ratio === null || ratio === undefined) return '-';
    return `${Number(ratio).toFixed(1)}%`;
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
    const pageSize = 50; // 무한 스크롤: 50개씩 조회

    // 로컬 상태
    const [searchInput, setSearchInput] = useState(filter.searchQuery);
    const [selectedMember, setSelectedMember] = useState<MemberWithLandInfo | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);

    // API 호출 (무한 스크롤) - DB에서 그룹핑/정렬 완료된 데이터 반환
    const { data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useApprovedMembersInfinite({
        unionId,
        searchQuery: filter.searchQuery,
        blockedFilter: filter.blockedFilter,
        pageSize,
    });

    // 페이지 데이터 평탄화 (DB에서 이미 그룹핑/정렬 완료됨)
    const members = useMemo(() => {
        return data?.pages.flatMap((page) => page.members) || [];
    }, [data?.pages]);

    const totalCount = data?.pages[0]?.total || 0;

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

    // 테이블 컬럼 정의 (순서: 번호, 이름, 소유유형, 물건지, 토지면적, 토지소유면적, 토지지분율, 건축면적, 건축소유면적, 건축지분율, 공시지가, 특이사항)
    const memberColumns: ColumnDef<MemberWithLandInfo>[] = useMemo(
        () => [
            // 1. 번호
            {
                key: 'rowNumber',
                header: '번호',
                width: '50px',
                align: 'center',
                render: (_, __, index) => index + 1,
            },
            // 2. 이름
            {
                key: 'name',
                header: '이름',
                align: 'left',
                width: '100px',
                render: (_, row) => (
                    <div className="flex items-center gap-2">
                        <span
                            className="text-[14px] font-medium text-gray-900 whitespace-nowrap max-w-[80px] overflow-hidden text-ellipsis inline-block"
                            title={row.name || ''}
                        >
                            {truncateName(row.name, 8)}
                        </span>
                        {!row.isPnuMatched && row.property_pnu && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 whitespace-nowrap">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                PNU 미매칭
                            </span>
                        )}
                        {!row.property_pnu && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                                <MapPin className="w-3 h-3 mr-1" />
                                PNU 없음
                            </span>
                        )}
                    </div>
                ),
            },
            // 3. 소유유형
            {
                key: 'ownership_type',
                header: '소유유형',
                align: 'left',
                width: '80px',
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
                        </span>
                    );
                },
            },
            // 4. 물건지
            {
                key: 'property_address',
                header: '물건지',
                width: '280px',
                className: 'text-gray-600',
                wrap: true,
                render: (_, row) => {
                    const propertyAddress = row.property_address_jibun || row.property_address || '-';
                    const totalCount = row.total_property_count || 1;
                    const hasMultipleProperties = totalCount > 1;

                    return (
                        <div className="flex items-start gap-2">
                            <span className="wrap-break-word">{propertyAddress}</span>
                            {hasMultipleProperties && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap shrink-0">
                                    <Home className="w-3 h-3 mr-1" />+{totalCount - 1}건
                                </span>
                            )}
                        </div>
                    );
                },
            },
            // 5. 토지면적 (공동소유자 합계)
            {
                key: 'total_land_area',
                header: '토지면적',
                align: 'center',
                width: '100px',
                render: (_, row) => {
                    return formatArea(row.total_land_area);
                },
            },
            // 6. 토지소유면적
            {
                key: 'land_area',
                header: '토지소유면적',
                align: 'center',
                width: '120px',
                render: (_, row) => {
                    return formatArea(row.land_area);
                },
            },
            // 7. 토지지분율
            {
                key: 'land_ownership_ratio',
                header: '토지지분율',
                align: 'center',
                width: '100px',
                render: (_, row) => {
                    return formatRatio(row.land_ownership_ratio);
                },
            },
            // 8. 건축면적 (공동소유자 합계)
            {
                key: 'total_building_area',
                header: '건축면적',
                align: 'center',
                width: '120px',
                render: (_, row) => {
                    return formatArea(row.total_building_area);
                },
            },
            // 9. 건축소유면적
            {
                key: 'building_area',
                header: '건축소유면적',
                align: 'center',
                width: '140px',
                render: (_, row) => {
                    return formatArea(row.building_area);
                },
            },
            // 10. 건축지분율
            {
                key: 'building_ownership_ratio',
                header: '건축지분율',
                align: 'center',
                width: '120px',
                render: (_, row) => {
                    return formatRatio(row.building_ownership_ratio);
                },
            },
            // 11. 공시지가 (전체 토지면적 기준으로 계산)
            {
                key: 'official_price',
                header: '공시지가',
                align: 'center',
                width: '200px',
                render: (_, row) => {
                    // 전체 토지면적 (land_lot.area) 기준으로 총액 계산
                    const totalLandArea = row.land_lot?.area;
                    const unitPrice = row.land_lot?.official_price;

                    const unitPriceStr = formatUnitPrice(unitPrice);
                    const totalPriceStr = formatTotalPrice(totalLandArea, unitPrice);

                    if (unitPrice === null || unitPrice === undefined) {
                        return <span className="text-gray-400">-</span>;
                    }

                    return (
                        <div className="flex flex-col items-end">
                            <span className="text-[13px] text-gray-900">{unitPriceStr}</span>
                            <span className="text-[12px] text-gray-500">(총 {totalPriceStr})</span>
                        </div>
                    );
                },
            },
            // 12. 특이사항
            {
                key: 'notes',
                header: '특이사항',
                width: '200px',
                align: 'center',
                className: 'text-gray-600',
                render: (value) => (
                    <span
                        className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px] inline-block"
                        title={(value as string) || ''}
                    >
                        {(value as string) || '-'}
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
                            <p className="text-sm text-gray-600">총 {totalCount}명</p>
                        </div>
                    </div>
                </div>

                {/* 테이블 - stickyHeader 모드에서 내부적으로 스크롤 관리 */}
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
                    minWidth="1610px"
                    maxHeight="600px"
                    stickyHeader={true}
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
