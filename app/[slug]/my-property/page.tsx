'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowLeft, Building2, Ruler, Percent, Banknote, Calculator } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useMyProperty, useMyPropertySummary } from '@/app/_lib/features/my-property/api/useMyPropertyHook';

// 숫자 포맷팅 유틸리티
const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString('ko-KR');
};

// 금액 포맷팅 (원 단위)
const formatCurrency = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    return `${num.toLocaleString('ko-KR')}원`;
};

// 면적 포맷팅 (m² 단위)
const formatArea = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    return `${num.toLocaleString('ko-KR')}㎡`;
};

// 소유유형 한글 변환
const getOwnershipTypeLabel = (type: string | null): string => {
    switch (type) {
        case 'OWNER':
            return '소유주';
        case 'CO_OWNER':
            return '공동소유';
        case 'FAMILY':
            return '소유주 가족';
        default:
            return '-';
    }
};

export default function MyPropertyPage() {
    const router = useRouter();
    const { union, isLoading: isUnionLoading } = useSlug();
    const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
    const { data: properties, isLoading: isPropertyLoading, error } = useMyProperty(user?.id);
    const summary = useMyPropertySummary(user?.id);

    // 로딩 상태
    if (isUnionLoading || isAuthLoading) {
        return (
            <div className="container mx-auto max-w-[1280px] px-4 py-8">
                <Skeleton className="w-full h-[400px] rounded-lg" />
            </div>
        );
    }

    // 비로그인 상태
    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">로그인이 필요합니다</CardTitle>
                        <CardDescription>
                            내 공시지가 정보를 확인하려면 먼저 로그인해주세요.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button onClick={() => router.push(`/${union?.slug}`)}>
                            홈으로 이동
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-[1280px] px-4 py-8">
            {/* 페이지 헤더 */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    className="mb-4 -ml-2 text-gray-600 hover:text-gray-900"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="size-4 mr-2" />
                    뒤로가기
                </Button>
                <div className="flex items-center gap-3">
                    <div className="size-12 bg-[#4e8c6d]/10 rounded-full flex items-center justify-center">
                        <MapPin className="size-6 text-[#4e8c6d]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">내 공시지가</h1>
                        <p className="text-gray-500">
                            {user.name}님의 물건지 공시지가 정보입니다.
                        </p>
                    </div>
                </div>
            </div>

            {/* 요약 정보 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Building2 className="size-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">물건지 수</p>
                                <p className="text-xl font-bold text-gray-900">{summary.totalCount}개</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <Ruler className="size-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">총 토지 면적</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {formatArea(summary.totalLandArea)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Ruler className="size-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">총 건물 면적</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {formatArea(summary.totalBuildingArea)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Calculator className="size-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">총 공시지가</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {formatCurrency(summary.totalLandPrice)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 물건지 상세 목록 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">물건지 상세 정보</CardTitle>
                    <CardDescription>
                        보유하고 계신 물건지의 면적, 소유지분, 공시지가 정보입니다.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isPropertyLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">
                            물건지 정보를 불러오는 중 오류가 발생했습니다.
                        </div>
                    ) : !properties || properties.length === 0 ? (
                        <div className="text-center py-12">
                            <MapPin className="size-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg mb-2">등록된 물건지가 없습니다.</p>
                            <p className="text-gray-400 text-sm">
                                관리자에게 문의하여 물건지 정보를 등록해주세요.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[200px]">물건지 주소</TableHead>
                                        <TableHead className="text-center">동/호</TableHead>
                                        <TableHead className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Ruler className="size-4" />
                                                면적 (㎡)
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Percent className="size-4" />
                                                소유지분
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Banknote className="size-4" />
                                                공시지가 (원/㎡)
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Calculator className="size-4" />
                                                총 공시지가
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-center">소유유형</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {properties.map((property) => (
                                        <TableRow key={property.id}>
                                            <TableCell>
                                                <div className="flex items-start gap-2">
                                                    {property.is_primary && (
                                                        <Badge variant="outline" className="shrink-0 text-[#4e8c6d] border-[#4e8c6d]">
                                                            대표
                                                        </Badge>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {property.address || '-'}
                                                        </p>
                                                        {property.building_name && (
                                                            <p className="text-sm text-gray-500">
                                                                {property.building_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {property.dong || property.ho ? (
                                                    <span className="text-gray-700">
                                                        {[property.dong, property.ho].filter(Boolean).join(' ')}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatNumber(property.land_area)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {property.land_ownership_ratio !== null ? (
                                                    <span className="font-medium text-blue-600">
                                                        {property.land_ownership_ratio}%
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">100%</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatNumber(property.official_price)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-bold text-[#4e8c6d]">
                                                    {formatCurrency(property.total_land_price)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge 
                                                    variant="secondary"
                                                    className={
                                                        property.ownership_type === 'OWNER' 
                                                            ? 'bg-green-100 text-green-700' 
                                                            : property.ownership_type === 'CO_OWNER'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                    }
                                                >
                                                    {getOwnershipTypeLabel(property.ownership_type)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 안내 문구 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">📌 공시지가 안내</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 공시지가는 국토교통부에서 매년 1월 1일 기준으로 조사·평가하여 공시하는 토지의 단위면적당(㎡) 가격입니다.</li>
                    <li>• 총 공시지가는 면적 × 공시지가 × 소유지분으로 계산됩니다.</li>
                    <li>• 정보가 정확하지 않은 경우 조합 관리자에게 문의해주세요.</li>
                </ul>
            </div>
        </div>
    );
}
