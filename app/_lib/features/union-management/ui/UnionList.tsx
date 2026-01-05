'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, Plus, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UnionWithActive } from '../model/useUnionManagementStore';
import { DataTable, ColumnDef } from '@/app/_lib/widgets/common/data-table';

interface UnionListProps {
    unions: UnionWithActive[];
    isLoading: boolean;
    searchKeyword: string;
    filterStatus: 'all' | 'active' | 'inactive';
    onSearchChange: (keyword: string) => void;
    onFilterChange: (status: 'all' | 'active' | 'inactive') => void;
    onSearch: () => void;
}

// 날짜 포맷 함수
function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

// 조합 목록 테이블 컬럼 정의
const unionColumns: ColumnDef<UnionWithActive>[] = [
    {
        key: 'name',
        header: '조합명',
        className: 'font-medium',
        render: (_, row) => (
            <div className="flex items-center gap-2">
                {row.logo_url && (
                    <div className="relative w-8 h-8">
                        <Image
                            src={row.logo_url}
                            alt={row.name}
                            fill
                            className="rounded-full object-cover"
                        />
                    </div>
                )}
                {row.name}
            </div>
        ),
    },
    {
        key: 'address',
        header: '주소',
        className: 'text-gray-600',
        render: (value) => (value as string) || '-',
    },
    {
        key: 'phone',
        header: '전화번호',
        className: 'text-gray-600',
        render: (value) => (value as string) || '-',
    },
    {
        key: 'is_active',
        header: '활성 여부',
        align: 'center',
        render: (value) =>
            value ? (
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    활성
                </div>
            ) : (
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    <XCircle className="w-3.5 h-3.5" />
                    비활성
                </div>
            ),
    },
    {
        key: 'created_at',
        header: '생성일',
        className: 'text-gray-600',
        render: (value) => formatDate(value as string),
    },
];

export default function UnionList({
    unions,
    isLoading,
    searchKeyword,
    filterStatus,
    onSearchChange,
    onFilterChange,
    onSearch,
}: UnionListProps) {
    const router = useRouter();

    const handleRowClick = (union: UnionWithActive) => {
        router.push(`/admin/unions/${union.id}`);
    };

    const handleAddClick = () => {
        router.push('/admin/unions/new');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSearch();
        }
    };

    return (
        <Card className="shadow-lg">
            <CardHeader className="border-b bg-gray-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-xl font-semibold">조합 목록</CardTitle>
                    <Button onClick={handleAddClick} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        조합 추가
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                {/* 검색 필터 영역 */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="조합명으로 검색..."
                            value={searchKeyword}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="pl-10"
                        />
                    </div>
                    <Select
                        value={filterStatus}
                        onValueChange={(value) => onFilterChange(value as 'all' | 'active' | 'inactive')}
                    >
                        <SelectTrigger className="w-full md:w-40">
                            <SelectValue placeholder="상태 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            <SelectItem value="active">활성</SelectItem>
                            <SelectItem value="inactive">비활성</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={onSearch} variant="outline">
                        <Search className="w-4 h-4 mr-2" />
                        조회
                    </Button>
                </div>

                {/* 테이블 */}
                <div className="border rounded-lg overflow-hidden">
                    <DataTable<UnionWithActive>
                        data={unions}
                        columns={unionColumns}
                        keyExtractor={(row) => row.id}
                        isLoading={isLoading}
                        emptyMessage="조회된 조합이 없습니다."
                        emptyIcon={<Building2 className="w-12 h-12 text-gray-300" />}
                        onRowClick={handleRowClick}
                        getRowClassName={() => 'hover:bg-blue-50'}
                        minWidth="700px"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
