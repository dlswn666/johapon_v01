'use client';

import AnnouncementsList from '@/widgets/announcements/AnnouncementsList';
import BannerAd from '@/widgets/common/BannerAd';
import { type ListCategoryOption } from '@/components/common/ListFilter';
import AnnouncementsFilterClient from '@/features/announcements/filter/AnnouncementsFilterClient';
import { Card, CardContent } from '@/shared/ui/card';
import { useAnnouncements } from '@/shared/hooks/useAnnouncements';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

export default function TenantAnnouncementsPage() {
    const searchParams = useSearchParams();
    const {
        announcements,
        categories,
        subcategories,
        loading,
        error,
        total,
        hasMore,
        setFilter,
        observerRef,
        refresh,
    } = useAnnouncements({ pageSize: 10 });

    // 새로고침 파라미터 확인 (추가 안전장치)
    useEffect(() => {
        const refreshParam = searchParams?.get('refresh');
        if (refreshParam) {
            // 아주 짧은 지연 후 refresh 실행
            const timer = setTimeout(() => {
                refresh();
            }, 50);

            return () => clearTimeout(timer);
        }
    }, [searchParams, refresh]);

    // ListCategoryOption 형식으로 변환 (메모이제이션)
    const listCategories: ListCategoryOption[] = useMemo(
        () =>
            categories.map((cat) => ({
                id: cat.key,
                name: cat.name,
                count: cat.count || 0,
            })),
        [categories]
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-8">
                    <h1 className="text-2xl lg:text-3xl text-gray-900 mb-2">공지사항</h1>
                    <p className="text-gray-600 text-sm lg:text-base">
                        조합 운영과 재개발 관련 중요한 소식을 전해드립니다
                    </p>
                </div>
            </div>

            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd />
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardContent className="p-4">
                                <AnnouncementsFilterClient categories={listCategories} onFilterChange={setFilter} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4 flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                    {loading ? '로딩 중...' : `총 ${total}개의 공지사항`}
                                </div>
                                <Link href="./announcements/new" className="inline-block">
                                    <span className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700">
                                        새 공지사항 작성
                                    </span>
                                </Link>
                            </CardContent>
                        </Card>

                        <AnnouncementsList
                            announcements={announcements}
                            loading={loading}
                            error={error}
                            hasMore={hasMore}
                            observerRef={observerRef}
                        />
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd />
                    </div>
                </div>
            </div>
        </div>
    );
}
