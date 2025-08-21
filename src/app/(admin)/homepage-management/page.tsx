'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
    Search,
    Filter,
    Download,
    Calendar,
    Building2,
    Phone,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Clock,
    MoreHorizontal,
    Eye,
    Edit,
    Settings,
    Plus,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import Link from 'next/link';

interface HomepageData {
    id: string;
    associationName: string;
    address: string;
    phone: string;
    email: string;
    domain: string;
    logoUrl: string;
    contractExpired: boolean;
    registrationDate: string;
    expirationDate: string;
    status: 'active' | 'expired' | 'expiring';
    lastUpdate: string;
}

interface Stats {
    total: number;
    active: number;
    expired: number;
    expiring: number;
}

export default function HomepageManagementPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [homepageData, setHomepageData] = useState<HomepageData[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, active: 0, expired: 0, expiring: 0 });
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // 데이터 로드
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const searchParams = new URLSearchParams({
                search: searchTerm,
                status: filterStatus,
                page: currentPage.toString(),
                limit: '10',
            });

            const response = await fetch(`/api/admin/homepage-management?${searchParams}`);

            if (!response.ok) {
                // HTTP 상태 코드에 따른 구체적인 에러 메시지
                const errorMessage =
                    response.status === 404
                        ? '요청한 리소스를 찾을 수 없습니다.'
                        : response.status === 500
                        ? '서버 오류가 발생했습니다.'
                        : `데이터 로드 실패 (${response.status})`;
                throw new Error(errorMessage);
            }

            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                console.error('JSON 파싱 오류:', jsonError);
                throw new Error('서버 응답 형식이 올바르지 않습니다.');
            }

            setHomepageData(result.data || []);
            setStats(result.stats || { total: 0, active: 0, expired: 0, expiring: 0 });
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            // 에러 시 빈 배열로 설정
            setHomepageData([]);
            setStats({ total: 0, active: 0, expired: 0, expiring: 0 });

            // 사용자에게 에러 메시지 표시 (선택적)
            if (error instanceof Error) {
                console.warn('데이터 로드 실패:', error.message);
            }
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterStatus, currentPage]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getStatusInfo = (status: string, contractExpired: boolean) => {
        if (contractExpired || status === 'expired') {
            return {
                label: '계약만료',
                color: 'bg-red-100 text-red-800',
                icon: AlertCircle,
                iconColor: 'text-red-600',
            };
        } else if (status === 'expiring') {
            return {
                label: '만료임박',
                color: 'bg-yellow-100 text-yellow-800',
                icon: Clock,
                iconColor: 'text-yellow-600',
            };
        } else {
            return {
                label: '정상',
                color: 'bg-green-100 text-green-800',
                icon: CheckCircle2,
                iconColor: 'text-green-600',
            };
        }
    };

    const handleExport = () => {
        // 데이터가 없으면 알림 후 종료
        if (!homepageData || homepageData.length === 0) {
            alert('내보낼 데이터가 없습니다.');
            return;
        }

        try {
            // CSV 내보내기 구현
            const csvData = homepageData.map((item) => ({
                조합명: item.associationName,
                주소: item.address,
                전화번호: item.phone,
                이메일: item.email,
                도메인: item.domain,
                상태: item.status === 'active' ? '정상' : item.status === 'expired' ? '만료' : '만료임박',
                등록일: item.registrationDate,
                만료일: item.expirationDate,
            }));

            const csvContent = [
                Object.keys(csvData[0]).join(','),
                ...csvData.map((row) => Object.values(row).join(',')),
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `홈페이지_관리_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();

            // 메모리 정리
            setTimeout(() => {
                URL.revokeObjectURL(link.href);
            }, 100);
        } catch (error) {
            console.error('CSV 내보내기 오류:', error);
            alert('CSV 파일 생성 중 오류가 발생했습니다.');
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
                            <h1 className="text-3xl font-bold text-gray-900">홈페이지 관리</h1>
                            <p className="text-gray-600 mt-1">재개발조합 홈페이지 현황 및 관리</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Button variant="outline" onClick={handleExport} className="flex items-center space-x-2">
                                <Download className="h-4 w-4" />
                                <span>데이터 내보내기</span>
                            </Button>
                            <Link href="/homepage-management/new">
                                <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
                                    <Plus className="h-4 w-4" />
                                    <span>새 홈페이지 등록</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-8">
                    {/* 상단 조회 영역 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Search className="h-5 w-5 text-blue-600" />
                                <span>홈페이지 검색 및 필터</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* 통계 요약 */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600 mb-1">{stats.total}</div>
                                    <div className="text-sm text-gray-700">전체</div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600 mb-1">{stats.active}</div>
                                    <div className="text-sm text-gray-700">정상</div>
                                </div>
                                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600 mb-1">{stats.expiring}</div>
                                    <div className="text-sm text-gray-700">만료임박</div>
                                </div>
                                <div className="text-center p-4 bg-red-50 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600 mb-1">{stats.expired}</div>
                                    <div className="text-sm text-gray-700">계약만료</div>
                                </div>
                            </div>

                            {/* 검색 및 필터 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        조합명 / 주소 / 도메인 검색
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="검색어를 입력하세요"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">상태 필터</label>
                                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="상태 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">전체</SelectItem>
                                            <SelectItem value="active">정상</SelectItem>
                                            <SelectItem value="expiring">만료임박</SelectItem>
                                            <SelectItem value="expired">계약만료</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 하단 리스트 영역 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Building2 className="h-5 w-5 text-green-600" />
                                    <span>홈페이지 목록</span>
                                    <Badge variant="outline" className="ml-2">
                                        {homepageData.length}개
                                    </Badge>
                                </div>
                                <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                                    <Filter className="h-4 w-4" />
                                    <span>고급 필터</span>
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16">Index</TableHead>
                                            <TableHead className="min-w-[250px]">조합명</TableHead>
                                            <TableHead className="min-w-[200px]">조합 주소</TableHead>
                                            <TableHead className="w-32">전화번호</TableHead>
                                            <TableHead className="w-24">계약상태</TableHead>
                                            <TableHead className="w-28">등록일</TableHead>
                                            <TableHead className="w-28">종료일</TableHead>
                                            <TableHead className="w-20">관리</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {homepageData.map((homepage, index) => {
                                            const statusInfo = getStatusInfo(homepage.status, homepage.contractExpired);
                                            const StatusIcon = statusInfo.icon;

                                            return (
                                                <TableRow key={homepage.id} className="hover:bg-gray-50">
                                                    <TableCell className="text-gray-500">
                                                        {(currentPage - 1) * 10 + index + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="font-medium text-gray-900 line-clamp-2">
                                                                {homepage.associationName}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {homepage.domain}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-start space-x-2">
                                                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                            <span className="text-sm text-gray-700 line-clamp-2">
                                                                {homepage.address}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center space-x-2">
                                                            <Phone className="h-4 w-4 text-gray-400" />
                                                            <span className="text-sm text-gray-700">
                                                                {homepage.phone}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={statusInfo.color}>
                                                            <StatusIcon
                                                                className={`h-3 w-3 mr-1 ${statusInfo.iconColor}`}
                                                            />
                                                            {statusInfo.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-600">
                                                        {homepage.registrationDate}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-600">
                                                        {homepage.expirationDate}
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                >
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    className="flex items-center space-x-2"
                                                                    onClick={() =>
                                                                        window.open(homepage.domain, '_blank')
                                                                    }
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                    <span>홈페이지 보기</span>
                                                                </DropdownMenuItem>
                                                                <Link href={`./edit/${homepage.id}`}>
                                                                    <DropdownMenuItem className="flex items-center space-x-2">
                                                                        <Edit className="h-4 w-4" />
                                                                        <span>정보 수정</span>
                                                                    </DropdownMenuItem>
                                                                </Link>
                                                                <Link href={`./settings/${homepage.id}`}>
                                                                    <DropdownMenuItem className="flex items-center space-x-2">
                                                                        <Settings className="h-4 w-4" />
                                                                        <span>설정 관리</span>
                                                                    </DropdownMenuItem>
                                                                </Link>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {homepageData.length === 0 && (
                                <div className="text-center py-12">
                                    <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">검색 조건에 맞는 홈페이지가 없습니다.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 빠른 작업 카드 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-blue-200 bg-blue-50">
                            <CardContent className="p-6">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <Calendar className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-blue-900 mb-1">계약 만료 알림</h3>
                                        <p className="text-sm text-blue-700">
                                            {stats.expiring}개의 홈페이지가 만료 예정입니다.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-green-200 bg-green-50">
                            <CardContent className="p-6">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-green-900 mb-1">정상 운영</h3>
                                        <p className="text-sm text-green-700">
                                            {stats.active}개의 홈페이지가 정상 운영 중입니다.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
