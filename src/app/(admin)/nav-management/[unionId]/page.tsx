'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
    ArrowLeft,
    Building2,
    Menu,
    Shield,
    Settings,
    Edit,
    Eye,
    CheckCircle2,
    XCircle,
    Users,
    Clock,
    ExternalLink,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface UnionDetail {
    id: string;
    name: string;
    homepage: string;
    address: string;
    phone: string;
    email: string;
}

interface MenuItemDetail {
    id: string;
    key: string;
    labelDefault: string;
    customLabel?: string;
    path: string;
    enabled: boolean;
    displayOrder: number;
    permissions: {
        roleId: string;
        roleName: string;
        canView: boolean;
    }[];
}

interface NavDetailData {
    union: UnionDetail;
    menus: MenuItemDetail[];
    stats: {
        totalMenus: number;
        enabledMenus: number;
        customLabels: number;
        lastUpdated: string;
    };
}

export default function NavDetailPage() {
    const router = useRouter();
    const params = useParams();
    const unionId = params.unionId as string;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<NavDetailData | null>(null);

    const loadDetailData = useCallback(async () => {
        try {
            setLoading(true);

            const response = await fetch(`/api/admin/nav-management/${unionId}`);

            if (!response.ok) {
                throw new Error('데이터 로드 실패');
            }

            const result = await response.json();
            setData(result.data);
        } catch (error) {
            console.error('상세 데이터 로드 오류:', error);
            // 임시 데이터 (개발 중)
            setData({
                union: {
                    id: unionId,
                    name: '강남재개발조합',
                    homepage: 'gangnam',
                    address: '서울시 강남구 테헤란로 123',
                    phone: '02-1234-5678',
                    email: 'info@gangnam-union.com',
                },
                menus: [
                    {
                        id: 'menu1',
                        key: 'home',
                        labelDefault: '홈',
                        path: '/',
                        enabled: true,
                        displayOrder: 1,
                        permissions: [
                            { roleId: 'role1', roleName: '관리자', canView: true },
                            { roleId: 'role3', roleName: '조합원', canView: true },
                        ],
                    },
                    {
                        id: 'menu2',
                        key: 'announcements',
                        labelDefault: '공지사항',
                        customLabel: '조합 공지',
                        path: '/announcements',
                        enabled: true,
                        displayOrder: 2,
                        permissions: [
                            { roleId: 'role1', roleName: '관리자', canView: true },
                            { roleId: 'role3', roleName: '조합원', canView: true },
                        ],
                    },
                    {
                        id: 'menu3',
                        key: 'community',
                        labelDefault: '커뮤니티',
                        path: '/community',
                        enabled: true,
                        displayOrder: 3,
                        permissions: [
                            { roleId: 'role1', roleName: '관리자', canView: true },
                            { roleId: 'role3', roleName: '조합원', canView: false },
                        ],
                    },
                    {
                        id: 'menu4',
                        key: 'qna',
                        labelDefault: 'Q&A',
                        path: '/qna',
                        enabled: false,
                        displayOrder: 4,
                        permissions: [
                            { roleId: 'role1', roleName: '관리자', canView: true },
                            { roleId: 'role3', roleName: '조합원', canView: false },
                        ],
                    },
                    {
                        id: 'menu5',
                        key: 'chairman-greeting',
                        labelDefault: '조합장 인사말',
                        customLabel: '이사장 인사',
                        path: '/chairman-greeting',
                        enabled: true,
                        displayOrder: 5,
                        permissions: [
                            { roleId: 'role1', roleName: '관리자', canView: true },
                            { roleId: 'role3', roleName: '조합원', canView: true },
                        ],
                    },
                    {
                        id: 'menu6',
                        key: 'organization-chart',
                        labelDefault: '조직도',
                        path: '/organization-chart',
                        enabled: true,
                        displayOrder: 6,
                        permissions: [
                            { roleId: 'role1', roleName: '관리자', canView: true },
                            { roleId: 'role3', roleName: '조합원', canView: false },
                        ],
                    },
                    {
                        id: 'menu7',
                        key: 'office',
                        labelDefault: '사무소 안내',
                        path: '/office',
                        enabled: true,
                        displayOrder: 7,
                        permissions: [
                            { roleId: 'role1', roleName: '관리자', canView: true },
                            { roleId: 'role3', roleName: '조합원', canView: true },
                        ],
                    },
                    {
                        id: 'menu8',
                        key: 'redevelopment',
                        labelDefault: '재개발 현황',
                        path: '/redevelopment',
                        enabled: false,
                        displayOrder: 8,
                        permissions: [
                            { roleId: 'role1', roleName: '관리자', canView: true },
                            { roleId: 'role3', roleName: '조합원', canView: false },
                        ],
                    },
                ],
                stats: {
                    totalMenus: 8,
                    enabledMenus: 6,
                    customLabels: 2,
                    lastUpdated: '2024-01-15',
                },
            });
        } finally {
            setLoading(false);
        }
    }, [unionId]);

    useEffect(() => {
        if (unionId) {
            loadDetailData();
        }
    }, [unionId, loadDetailData]);

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

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-gray-600">데이터를 찾을 수 없습니다.</p>
                    <Button variant="outline" onClick={() => router.push('/nav-management')} className="mt-4">
                        목록으로 돌아가기
                    </Button>
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
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                onClick={() => router.push('/nav-management')}
                                className="flex items-center space-x-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span>목록으로</span>
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">메뉴 상세 정보</h1>
                                <p className="text-gray-600 mt-1">{data.union.name} 메뉴 구성 및 권한 현황</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Link href={`https://${data.union.homepage}.example.com`} target="_blank">
                                <Button variant="outline" className="flex items-center space-x-2">
                                    <ExternalLink className="h-4 w-4" />
                                    <span>홈페이지 보기</span>
                                </Button>
                            </Link>
                            <Link href={`/nav-management/${unionId}/edit`}>
                                <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
                                    <Edit className="h-4 w-4" />
                                    <span>설정 수정</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Union Info & Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Union Information */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Building2 className="h-5 w-5" />
                                <span>조합 정보</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">조합명</p>
                                <p className="font-medium">{data.union.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">홈페이지 주소</p>
                                <code className="bg-gray-100 px-2 py-1 rounded text-sm">{data.union.homepage}</code>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">주소</p>
                                <p className="text-sm">{data.union.address}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">연락처</p>
                                <p className="text-sm">{data.union.phone}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">이메일</p>
                                <p className="text-sm">{data.union.email}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats */}
                    <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">전체 메뉴</CardTitle>
                                <Menu className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.stats.totalMenus}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">활성 메뉴</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{data.stats.enabledMenus}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">커스텀 라벨</CardTitle>
                                <Settings className="h-4 w-4 text-orange-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600">{data.stats.customLabels}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">최종 수정</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-medium">{data.stats.lastUpdated}</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Menu Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Menu className="h-5 w-5" />
                            <span>메뉴 구성 및 권한</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>순서</TableHead>
                                        <TableHead>메뉴명</TableHead>
                                        <TableHead>경로</TableHead>
                                        <TableHead>상태</TableHead>
                                        <TableHead>관리자</TableHead>
                                        <TableHead>조합원</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.menus
                                        .sort((a, b) => a.displayOrder - b.displayOrder)
                                        .map((menu) => {
                                            const adminPerm = menu.permissions.find((p) => p.roleName === '관리자');
                                            const memberPerm = menu.permissions.find((p) => p.roleName === '조합원');

                                            return (
                                                <TableRow key={menu.id}>
                                                    <TableCell className="text-center font-mono">
                                                        {menu.displayOrder}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">
                                                                {menu.customLabel || menu.labelDefault}
                                                            </p>
                                                            {menu.customLabel && (
                                                                <p className="text-sm text-gray-500">
                                                                    (기본: {menu.labelDefault})
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                                            {menu.path}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={menu.enabled ? 'default' : 'secondary'}
                                                            className={
                                                                menu.enabled ? 'bg-green-100 text-green-800' : ''
                                                            }
                                                        >
                                                            {menu.enabled ? (
                                                                <>
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                    활성
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircle className="h-3 w-3 mr-1" />
                                                                    비활성
                                                                </>
                                                            )}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {adminPerm?.canView ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {memberPerm?.canView ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
