'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, Plus, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UnionWithActive } from '../model/useUnionManagementStore';

interface UnionListProps {
    unions: UnionWithActive[];
    isLoading: boolean;
    searchKeyword: string;
    filterStatus: 'all' | 'active' | 'inactive';
    onSearchChange: (keyword: string) => void;
    onFilterChange: (status: 'all' | 'active' | 'inactive') => void;
    onSearch: () => void;
}

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

    const handleRowClick = (unionId: string) => {
        router.push(`/admin/unions/${unionId}`);
    };

    const handleAddClick = () => {
        router.push('/admin/unions/new');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSearch();
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
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
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="font-semibold">조합명</TableHead>
                                <TableHead className="font-semibold">주소</TableHead>
                                <TableHead className="font-semibold">전화번호</TableHead>
                                <TableHead className="font-semibold text-center">활성 여부</TableHead>
                                <TableHead className="font-semibold">생성일</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32">
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                            <span className="ml-2 text-gray-500">로딩 중...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : unions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                                        조회된 조합이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                unions.map((union) => (
                                    <TableRow
                                        key={union.id}
                                        onClick={() => handleRowClick(union.id)}
                                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {union.logo_url && (
                                                    <div className="relative w-8 h-8">
                                                        <Image
                                                            src={union.logo_url}
                                                            alt={union.name}
                                                            fill
                                                            className="rounded-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                                {union.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-600">{union.address || '-'}</TableCell>
                                        <TableCell className="text-gray-600">{union.phone || '-'}</TableCell>
                                        <TableCell className="text-center">
                                            {union.is_active ? (
                                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    활성
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    비활성
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-gray-600">{formatDate(union.created_at)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
