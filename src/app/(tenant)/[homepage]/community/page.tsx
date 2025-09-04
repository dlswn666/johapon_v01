'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import CommunityPostList from '@/widgets/community/CommunityPostList';
import SideBannerAds from '@/widgets/common/SideBannerAds';
import CommunityFilterClient from '@/features/community/filter/CommunityFilterClient';
import { type ListCategoryOption } from '@/components/common/ListFilter';
import { Card, CardContent } from '@/shared/ui/card';
import { useCommunityStore } from '@/shared/store/communityStore';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function TenantCommunityPage() {
    const searchParams = useSearchParams();
    const params = useParams();
    const homepage = params?.homepage as string;

    // Store 사용
    const {
        posts,
        categories,
        subcategories,
        loading,
        error,
        total,
        hasMore,
        filters,
        setFilters,
        fetchPosts,
        fetchMetadata,
        resetState,
    } = useCommunityStore();

    // 새로고침 파라미터 확인 및 초기 데이터 로드
    useEffect(() => {
        if (!homepage) return;

        const refreshParam = searchParams?.get('refresh');

        if (refreshParam) {
            // 새로고침 요청 시 상태 초기화 후 다시 로드
            resetState();
            Promise.all([
                fetchMetadata(homepage).catch((error) => {
                    console.error('메타데이터 로딩 실패:', error);
                }),
                fetchPosts(homepage, true).catch((error) => {
                    console.error('게시글 로딩 실패:', error);
                }),
            ]);
        } else {
            // 일반 페이지 로드
            Promise.all([
                fetchMetadata(homepage).catch((error) => {
                    console.error('메타데이터 로딩 실패:', error);
                }),
                fetchPosts(homepage, true).catch((error) => {
                    console.error('게시글 로딩 실패:', error);
                }),
            ]);
        }
    }, [searchParams, homepage, fetchPosts, fetchMetadata, resetState]);

    // 필터 변경 시 데이터 다시 로드
    useEffect(() => {
        if (homepage) {
            fetchPosts(homepage, true).catch((error) => {
                console.error('필터링된 게시글 로딩 실패:', error);
            });
        }
    }, [filters, homepage, fetchPosts]);

    // 더 많은 데이터 로드 (무한 스크롤)
    const loadMore = async () => {
        if (!loading && hasMore && homepage) {
            try {
                await fetchPosts(homepage, false);
            } catch (error) {
                console.error('추가 게시글 로딩 실패:', error);
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
            <div className="min-h-screen bg-white">
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-8">
                        <h1 className="text-2xl lg:text-3xl text-gray-900 mb-2">자유게시판</h1>
                        <p className="text-gray-600 text-sm lg:text-base">
                            조합원들과 자유롭게 소통하고 정보를 나누는 공간입니다
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
                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
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
        <div className="min-h-screen bg-white">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-8">
                    <h1 className="text-2xl lg:text-3xl text-gray-900 mb-2">자유게시판</h1>
                    <p className="text-gray-600 text-sm lg:text-base">
                        조합원들과 자유롭게 소통하고 정보를 나누는 공간입니다
                    </p>
                </div>
            </div>

            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <SideBannerAds sticky />
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900">전체 게시글 ({total}개)</h2>
                                    <Link
                                        href="./community/new"
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                                    >
                                        글 작성
                                    </Link>
                                </div>

                                <CommunityFilterClient
                                    onFilterChange={(filterData) => {
                                        setFilters({
                                            categoryKey:
                                                filterData.categoryKey === 'all' ? undefined : filterData.categoryKey,
                                            subcategoryId: filterData.subcategoryId || undefined,
                                            searchTerm: filterData.searchTerm || undefined,
                                            isAnonymous: filterData.isAnonymous,
                                        });
                                    }}
                                />
                            </CardContent>
                        </Card>

                        <CommunityPostList
                            posts={posts}
                            loading={loading}
                            error={error}
                            hasMore={hasMore}
                            observerRef={observerRef}
                        />
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <SideBannerAds sticky />
                    </div>
                </div>
            </div>
        </div>
    );
}
