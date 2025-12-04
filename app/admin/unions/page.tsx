'use client';

import React, { useCallback } from 'react';
import { useUnions, useUnionStats } from '@/app/_lib/features/union-management/api/useUnionManagementHook';
import { useUnionManagementStore } from '@/app/_lib/features/union-management/model/useUnionManagementStore';
import { UnionDashboard, UnionList } from '@/app/_lib/features/union-management/ui';

export default function UnionsPage() {
    const { data: unions, isLoading, refetch } = useUnions();
    const { data: stats, isLoading: isStatsLoading } = useUnionStats();

    const searchKeyword = useUnionManagementStore((state) => state.searchKeyword);
    const filterStatus = useUnionManagementStore((state) => state.filterStatus);
    const setSearchKeyword = useUnionManagementStore((state) => state.setSearchKeyword);
    const setFilterStatus = useUnionManagementStore((state) => state.setFilterStatus);

    const handleSearch = useCallback(() => {
        refetch();
    }, [refetch]);

    return (
        <div className="space-y-8">
            {/* 페이지 타이틀 */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">조합 관리</h1>
                <p className="mt-1 text-sm text-gray-500">등록된 조합을 관리하고 새로운 조합을 추가할 수 있습니다</p>
            </div>

            {/* 대시보드 */}
            <UnionDashboard
                totalCount={stats?.total ?? 0}
                activeCount={stats?.active ?? 0}
                inactiveCount={stats?.inactive ?? 0}
                isLoading={isStatsLoading}
            />

            {/* 조합 리스트 */}
            <UnionList
                unions={unions ?? []}
                isLoading={isLoading}
                searchKeyword={searchKeyword}
                filterStatus={filterStatus}
                onSearchChange={setSearchKeyword}
                onFilterChange={setFilterStatus}
                onSearch={handleSearch}
            />
        </div>
    );
}
