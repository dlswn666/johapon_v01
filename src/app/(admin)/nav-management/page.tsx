'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Search, Download, Plus, Building2, Menu, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UnionNavData {
    id: string;
    unionId: string;
    unionName: string;
    homepage: string;
    lastUpdated: string;
    contractStatus: 'operating' | 'suspended'; // 운영중, 중단
}

export default function NavManagementPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState(''); // 검색 입력용 별도 상태
    const [sortBy, setSortBy] = useState('unionName'); // 정렬 기준
    const [navData, setNavData] = useState<UnionNavData[]>([]);
    const [totalUnions, setTotalUnions] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // 데이터 로드
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const searchParams = new URLSearchParams({
                search: searchTerm,
                sortBy: sortBy,
                page: currentPage.toString(),
                limit: '10',
            });

            const response = await fetch(`/api/admin/nav-management?${searchParams}`);

            if (!response.ok) {
                const errorMessage =
                    response.status === 404
                        ? '요청한 리소스를 찾을 수 없습니다.'
                        : response.status === 500
                        ? '서버 오류가 발생했습니다.'
                        : `데이터 로드 실패 (${response.status})`;
                throw new Error(errorMessage);
            }

            const result = await response.json();
            setNavData(result.data || []);
            setTotalUnions(result.totalUnions || 0);
            setTotalPages(result.pagination?.totalPages || 1);
            setTotalCount(result.pagination?.totalCount || 0);
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            setNavData([]);
            setTotalUnions(0);
            setTotalPages(1);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, sortBy, currentPage]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 검색 실행
    const handleSearch = () => {
        setSearchTerm(searchInput);
        setCurrentPage(1); // 검색 시 첫 페이지로 이동
    };

    // 엔터 키 처리
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // 정렬 변경 처리
    const handleSortChange = (value: string) => {
        setSortBy(value);
        setCurrentPage(1); // 정렬 변경 시 첫 페이지로 이동
    };

    // 행 클릭 핸들러
    const handleRowClick = (unionId: string) => {
        router.push(`/nav-management/${unionId}`);
    };

    // 페이지 변경 핸들러
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // 페이지네이션 생성
    const generatePagination = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, start + maxVisiblePages - 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        }

        return pages;
    };

    // 계약 상태별 색상 및 텍스트
    const getContractStatusConfig = (status: string) => {
        switch (status) {
            case 'operating':
                return {
                    color: 'bg-green-100 text-green-800',
                    text: '운영중',
                };
            case 'suspended':
                return {
                    color: 'bg-red-100 text-red-800',
                    text: '중단',
                };
            default:
                return {
                    color: 'bg-gray-100 text-gray-800',
                    text: '알 수 없음',
                };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">데이터를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">네비게이션 관리</h1>
                            <p className="text-gray-600 mt-1">조합별 메뉴 구성 및 권한 관리</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Link href="../base-menu-management">
                                <Button variant="outline" className="flex items-center space-x-2">
                                    <Settings className="h-4 w-4" />
                                    <span>기준 메뉴 관리</span>
                                </Button>
                            </Link>
                            <Button variant="outline" onClick={() => {}} className="flex items-center space-x-2">
                                <Download className="h-4 w-4" />
                                <span>데이터 내보내기</span>
                            </Button>
                            <Link href="/nav-management/new">
                                <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
                                    <Plus className="h-4 w-4" />
                                    <span>메뉴 설정</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 조합 메뉴별 현황 라인 */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-2">
                        <Menu className="h-5 w-5 text-gray-600" />
                        <span className="text-lg font-medium text-gray-900">조합 메뉴별 현황</span>
                    </div>
                    <div className="text-sm text-gray-600">
                        전체 조합: <span className="font-semibold">{totalUnions}</span>개
                    </div>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="조합명 또는 홈페이지 주소로 검색..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <Button onClick={handleSearch} className="flex items-center space-x-2">
                                <Search className="h-4 w-4" />
                                <span>검색</span>
                            </Button>
                            <Select value={sortBy} onValueChange={handleSortChange}>
                                <SelectTrigger className="w-[180px]">
                                    <span>정렬 기준</span>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unionName">조합명</SelectItem>
                                    <SelectItem value="createdAt">생성일</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Menu className="h-5 w-5" />
                            <span>조합별 메뉴 현황</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-10 border-b">
                                    <TableRow>
                                        <TableHead className="bg-gray-50 font-semibold">조합명</TableHead>
                                        <TableHead className="bg-gray-50 font-semibold">홈페이지 주소</TableHead>
                                        <TableHead className="bg-gray-50 font-semibold">계약 상태</TableHead>
                                        <TableHead className="bg-gray-50 font-semibold">최종 수정일</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="bg-white">
                                    {navData.map((item) => {
                                        const statusConfig = getContractStatusConfig(item.contractStatus);

                                        return (
                                            <TableRow
                                                key={item.id}
                                                className="cursor-pointer hover:bg-blue-50 hover:shadow-sm transition-all duration-200 border-b border-gray-100"
                                                onClick={() => handleRowClick(item.unionId)}
                                            >
                                                <TableCell className="font-medium p-4">
                                                    <div className="flex items-center space-x-2">
                                                        <Building2 className="h-4 w-4 text-gray-400" />
                                                        <span>{item.unionName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-4">
                                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                                        {item.homepage}
                                                    </code>
                                                </TableCell>
                                                <TableCell className="p-4">
                                                    <Badge className={statusConfig.color}>{statusConfig.text}</Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-600 p-4">{item.lastUpdated}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {navData.length === 0 && (
                            <div className="text-center py-8 px-4">
                                <Menu className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600">검색 결과가 없습니다.</p>
                            </div>
                        )}

                        {/* 페이지네이션 */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                                <div className="text-sm text-gray-600">
                                    총 {totalCount}개 항목 중 {(currentPage - 1) * 10 + 1}-
                                    {Math.min(currentPage * 10, totalCount)}개 표시
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="flex items-center space-x-1"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        <span>이전</span>
                                    </Button>

                                    {generatePagination().map((page) => (
                                        <Button
                                            key={page}
                                            variant={currentPage === page ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handlePageChange(page)}
                                            className={`min-w-[40px] ${
                                                currentPage === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                                            }`}
                                        >
                                            {page}
                                        </Button>
                                    ))}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center space-x-1"
                                    >
                                        <span>다음</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
