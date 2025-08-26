'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import AnnouncementsList from '@/widgets/announcements/AnnouncementsList';
import BannerAd from '@/widgets/common/BannerAd';
import { type ListCategoryOption } from '@/components/common/ListFilter';
import AnnouncementsFilterClient from '@/features/announcements/filter/AnnouncementsFilterClient';
import { Card, CardContent } from '@/shared/ui/card';
import { useAnnouncementStore } from '@/shared/store/announcementStore';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function TenantAnnouncementsPage() {
    const searchParams = useSearchParams();
    const params = useParams();
    const homepage = params?.homepage as string;

    // Store 사용
    const {
        announcements,
        categories,
        subcategories,
        loading,
        error,
        total,
        hasMore,
        filters,
        setFilters,
        fetchAnnouncements,
        resetState,
    } = useAnnouncementStore();

    // 새로고침 파라미터 확인 및 초기 데이터 로드
    useEffect(() => {
        if (!homepage) return;

        const refreshParam = searchParams?.get('refresh');

        if (refreshParam) {
            // 새로고침 요청 시 상태 초기화 후 다시 로드
            resetState();
            setTimeout(() => {
                fetchAnnouncements(homepage, true).catch((error) => {
                    console.error('공지사항 로딩 실패:', error);
                });
            }, 50);
        } else {
            // 일반 페이지 로드
            fetchAnnouncements(homepage, true).catch((error) => {
                console.error('공지사항 로딩 실패:', error);
            });
        }
    }, [searchParams, homepage, fetchAnnouncements, resetState]);

    // 필터 변경 시 데이터 다시 로드
    useEffect(() => {
        if (homepage) {
            fetchAnnouncements(homepage, true).catch((error) => {
                console.error('필터링된 공지사항 로딩 실패:', error);
            });
        }
    }, [filters, homepage, fetchAnnouncements]);

    // 더 많은 데이터 로드 (무한 스크롤)
    const loadMore = async () => {
        if (!loading && hasMore && homepage) {
            try {
                await fetchAnnouncements(homepage, false);
            } catch (error) {
                console.error('추가 공지사항 로딩 실패:', error);
            }
        }
    };

    // Observer ref for infinite scroll
    const observerRef = (node: HTMLElement | null) => {
        if (node && hasMore && !loading) {
            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        loadMore();
                    }
                },
                { threshold: 0.1 }
            );
            observer.observe(node);
            return () => observer.disconnect();
        }
    };

    // ListCategoryOption 형식으로 변환
    const listCategories: ListCategoryOption[] = categories.map((cat) => ({
        id: cat.key,
        name: cat.name,
        count: cat.count || 0,
    }));

    // 에러 상태 표시
    if (error) {
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
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
                            <p className="text-gray-600 mb-4">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                다시 시도
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900">전체 공지사항 ({total}개)</h2>
                                    <Link
                                        href="./announcements/new"
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                                    >
                                        공지사항 작성
                                    </Link>
                                </div>

                                <AnnouncementsFilterClient
                                    categories={listCategories}
                                    onFilterChange={(filterData) => {
                                        setFilters({
                                            categoryKey:
                                                filterData.categoryKey === 'all' ? undefined : filterData.categoryKey,
                                            subcategoryId: filterData.subcategoryId || undefined,
                                            searchTerm: filterData.searchTerm || undefined,
                                        });
                                    }}
                                />
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
