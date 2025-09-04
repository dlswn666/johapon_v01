'use client';

import React, { useEffect } from 'react';
import { useAdAdminStore } from '@/shared/store/adAdminStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import AdFormModal from '@/components/admin/AdFormModal';
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    Clock,
    XCircle,
    Users,
    Calendar,
    DollarSign,
    FileText,
} from 'lucide-react';

// 대시보드 카드 컴포넌트
function DashboardCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
}: {
    title: string;
    value: string | number;
    description: string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
}) {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
    const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                    {TrendIcon && <TrendIcon className={`mr-1 h-3 w-3 ${trendColor}`} />}
                    {description}
                </div>
            </CardContent>
        </Card>
    );
}

// 연체 업체 목록 컴포넌트
function OverduePartnersList({ partners }: { partners: any[] }) {
    if (partners.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">연체된 업체가 없습니다.</div>;
    }

    return (
        <div className="space-y-3">
            {partners.map((partner, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                        <div className="font-medium">{partner.partner_name}</div>
                        <div className="text-sm text-muted-foreground">{partner.phone}</div>
                    </div>
                    <div className="text-right">
                        <div className="font-medium text-red-600">{partner.overdue_amount.toLocaleString()}원</div>
                        <div className="text-sm text-muted-foreground">{partner.overdue_days}일 연체</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// 만료 임박 계약 목록 컴포넌트
function ExpiringContractsList({ contracts }: { contracts: any[] }) {
    if (contracts.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">만료 임박 계약이 없습니다.</div>;
    }

    return (
        <div className="space-y-3">
            {contracts.map((contract) => (
                <div key={contract.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                        <div className="font-medium">{contract.ad_title}</div>
                        <div className="text-sm text-muted-foreground">{contract.partner_name}</div>
                    </div>
                    <div className="text-right">
                        <div className="font-medium">{contract.end_date}</div>
                        <div className="text-sm text-orange-600">{contract.days_until_expiry}일 남음</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// 대시보드 탭 컴포넌트
function DashboardTab() {
    const { dashboardData, loading, fetchDashboard } = useAdAdminStore();

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">대시보드 데이터를 불러오는 중...</div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">대시보드 데이터를 불러올 수 없습니다.</div>
            </div>
        );
    }

    const { monthly_stats, contract_stats, overdue_partners, expiring_contracts } = dashboardData;

    return (
        <div className="space-y-6">
            {/* 재무 통계 카드 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <DashboardCard
                    title="이번달 입금액"
                    value={`${monthly_stats.paid_amount.toLocaleString()}원`}
                    description="지난달 대비"
                    icon={DollarSign}
                    trend="up"
                />
                <DashboardCard
                    title="입금 예정액"
                    value={`${monthly_stats.due_amount.toLocaleString()}원`}
                    description="이번달 예정"
                    icon={Clock}
                    trend="neutral"
                />
                <DashboardCard
                    title="연체 금액"
                    value={`${monthly_stats.overdue_amount.toLocaleString()}원`}
                    description={`${monthly_stats.overdue_partners_count}개 업체`}
                    icon={AlertTriangle}
                    trend="down"
                />
                <DashboardCard
                    title="활성 계약"
                    value={contract_stats.active}
                    description={`만료 임박 ${contract_stats.expiring_soon}건`}
                    icon={FileText}
                    trend="neutral"
                />
            </div>

            {/* 계약 상태 통계 */}
            <Card>
                <CardHeader>
                    <CardTitle>계약 상태 현황</CardTitle>
                    <CardDescription>전체 계약의 상태별 분포</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                활성 {contract_stats.active}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                                <Clock className="w-3 h-3 mr-1" />
                                대기 {contract_stats.pending}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-orange-200 text-orange-800">
                                <Calendar className="w-3 h-3 mr-1" />
                                만료 {contract_stats.expired}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="destructive">
                                <XCircle className="w-3 h-3 mr-1" />
                                취소 {contract_stats.cancelled}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 연체 업체 및 만료 임박 계약 */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            연체 업체
                        </CardTitle>
                        <CardDescription>입금이 지연된 업체 목록</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <OverduePartnersList partners={overdue_partners} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-orange-500" />
                            만료 임박 계약
                        </CardTitle>
                        <CardDescription>30일 이내 만료 예정 계약</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ExpiringContractsList contracts={expiring_contracts} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// 광고 관리 탭 컴포넌트
function AdsTab() {
    const {
        ads,
        loading,
        error,
        adsTotal,
        adsHasMore,
        adsFilters,
        fetchAds,
        setAdsFilters,
        resetAdsState,
        createAd,
        updateAd,
        deleteAd,
        fetchAdDetail,
        currentAd,
        setCurrentAd,
    } = useAdAdminStore();

    const [showCreateModal, setShowCreateModal] = React.useState(false);
    const [showEditModal, setShowEditModal] = React.useState(false);
    const [editingAd, setEditingAd] = React.useState<any>(null);

    React.useEffect(() => {
        fetchAds(true);
    }, [fetchAds, adsFilters]);

    const handleCreateAd = () => {
        setShowCreateModal(true);
    };

    const handleEditAd = async (ad: any) => {
        await fetchAdDetail(ad.id);
        setEditingAd(ad);
        setShowEditModal(true);
    };

    const handleDeleteAd = async (ad: any) => {
        if (confirm(`"${ad.title}" 광고를 삭제하시겠습니까?`)) {
            const result = await deleteAd(ad.id);
            if (result.success) {
                fetchAds(true);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* 필터 및 액션 바 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <select
                        value={adsFilters.placement || ''}
                        onChange={(e) => setAdsFilters({ placement: (e.target.value as any) || undefined })}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                        <option value="">모든 게재위치</option>
                        <option value="SIDE">사이드</option>
                        <option value="HOME">홈</option>
                        <option value="BOARD">게시판</option>
                    </select>

                    <select
                        value={adsFilters.active === undefined ? '' : adsFilters.active.toString()}
                        onChange={(e) =>
                            setAdsFilters({ active: e.target.value === '' ? undefined : e.target.value === 'true' })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                        <option value="">모든 상태</option>
                        <option value="true">활성</option>
                        <option value="false">비활성</option>
                    </select>

                    <input
                        type="text"
                        placeholder="광고명, 업체명, 전화번호 검색..."
                        value={adsFilters.search || ''}
                        onChange={(e) => setAdsFilters({ search: e.target.value || undefined })}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64"
                    />
                </div>

                <Button onClick={handleCreateAd}>광고 등록</Button>
            </div>

            {/* 광고 목록 */}
            {loading && ads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
            ) : error ? (
                <div className="text-center py-8 text-red-600">{error}</div>
            ) : ads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">등록된 광고가 없습니다.</div>
            ) : (
                <div className="grid gap-4">
                    {ads.map((ad) => (
                        <Card key={ad.id}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {ad.thumbnail_url && (
                                            <img
                                                src={ad.thumbnail_url}
                                                alt={ad.title}
                                                className="w-16 h-16 object-cover rounded"
                                            />
                                        )}
                                        <div>
                                            <h3 className="font-medium">{ad.title}</h3>
                                            <p className="text-sm text-muted-foreground">{ad.partner_name}</p>
                                            <p className="text-sm text-muted-foreground">{ad.phone}</p>
                                            <div className="flex gap-1 mt-1">
                                                {ad.placements.map((placement) => (
                                                    <Badge key={placement} variant="outline" className="text-xs">
                                                        {placement}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge variant={ad.is_active ? 'default' : 'secondary'}>
                                            {ad.is_active ? '활성' : '비활성'}
                                        </Badge>
                                        <Button variant="outline" size="sm" onClick={() => handleEditAd(ad)}>
                                            수정
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleDeleteAd(ad)}>
                                            삭제
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* 더보기 버튼 */}
            {adsHasMore && (
                <div className="text-center">
                    <Button variant="outline" onClick={() => fetchAds(false)} disabled={loading}>
                        {loading ? '로딩 중...' : '더보기'}
                    </Button>
                </div>
            )}

            {/* 광고 생성 모달 */}
            <AdFormModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={async (data) => {
                    const result = await createAd(data as any);
                    if (result.success) {
                        fetchAds(true);
                    }
                    return result;
                }}
                title="광고 등록"
            />

            {/* 광고 수정 모달 */}
            <AdFormModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingAd(null);
                    setCurrentAd(null);
                }}
                onSubmit={async (data) => {
                    if (!editingAd) return { success: false, message: '수정할 광고를 찾을 수 없습니다.' };
                    const result = await updateAd(editingAd.id, data as any);
                    if (result.success) {
                        fetchAds(true);
                    }
                    return result;
                }}
                editingAd={currentAd}
                title="광고 수정"
            />
        </div>
    );
}

function ContractsTab() {
    return <div className="text-center py-8 text-muted-foreground">계약 관리 탭 - 구현 예정</div>;
}

function InvoicesTab() {
    return <div className="text-center py-8 text-muted-foreground">청구서 관리 탭 - 구현 예정</div>;
}

// 메인 페이지 컴포넌트
export default function AdsManagementPage() {
    const { currentTab, setCurrentTab, selectedUnionId, setSelectedUnionId } = useAdAdminStore();

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">광고 관리</h1>
                    <p className="text-muted-foreground">배너 광고, 계약, 청구서를 통합 관리하세요</p>
                </div>

                {/* 조합 선택 필터 */}
                <div className="flex items-center gap-2">
                    <select
                        value={selectedUnionId || 'all'}
                        onChange={(e) => setSelectedUnionId(e.target.value === 'all' ? null : e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                        <option value="all">전체 조합</option>
                        <option value="common">공통 광고</option>
                        {/* TODO: 실제 조합 목록 추가 */}
                    </select>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            // 현재 탭에 따라 데이터 새로고침
                            // TODO: 구현
                        }}
                    >
                        새로고침
                    </Button>
                </div>
            </div>

            {/* 탭 네비게이션 */}
            <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as any)}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="dashboard">대시보드</TabsTrigger>
                    <TabsTrigger value="ads">광고 관리</TabsTrigger>
                    <TabsTrigger value="contracts">계약 관리</TabsTrigger>
                    <TabsTrigger value="invoices">청구서 관리</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-4">
                    <DashboardTab />
                </TabsContent>

                <TabsContent value="ads" className="space-y-4">
                    <AdsTab />
                </TabsContent>

                <TabsContent value="contracts" className="space-y-4">
                    <ContractsTab />
                </TabsContent>

                <TabsContent value="invoices" className="space-y-4">
                    <InvoicesTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
