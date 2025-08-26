'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import QnAList from '@/widgets/qna/QnAList';
import BannerAd from '@/widgets/common/BannerAd';
import { type ListCategoryOption } from '@/components/common/ListFilter';
import { Card, CardContent } from '@/shared/ui/card';
import { useQnAStore } from '@/shared/store/qnaStore';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function TenantQnAPage() {
    const searchParams = useSearchParams();
    const params = useParams();
    const homepage = params?.homepage as string;

    // Store 사용
    const {
        qnaList,
        categories,
        subcategories,
        loading,
        error,
        total,
        hasMore,
        filters,
        setFilters,
        fetchQnAList,
        resetState,
    } = useQnAStore();

    // 새로고침 파라미터 확인 및 초기 데이터 로드
    useEffect(() => {
        if (!homepage) return;

        const refreshParam = searchParams?.get('refresh');

        if (refreshParam) {
            // 새로고침 요청 시 상태 초기화 후 다시 로드
            resetState();
            setTimeout(() => {
                fetchQnAList(homepage, true).catch((error) => {
                    console.error('Q&A 로딩 실패:', error);
                });
            }, 50);
        } else {
            // 일반 페이지 로드
            fetchQnAList(homepage, true).catch((error) => {
                console.error('Q&A 로딩 실패:', error);
            });
        }
    }, [searchParams, homepage, fetchQnAList, resetState]);

    // 필터 변경 시 데이터 다시 로드
    useEffect(() => {
        if (homepage) {
            fetchQnAList(homepage, true).catch((error) => {
                console.error('필터링된 Q&A 로딩 실패:', error);
            });
        }
    }, [filters, homepage, fetchQnAList]);

    // 더 많은 데이터 로드 (무한 스크롤)
    const loadMore = async () => {
        if (!loading && hasMore && homepage) {
            try {
                await fetchQnAList(homepage, false);
            } catch (error) {
                console.error('추가 Q&A 로딩 실패:', error);
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
                        <h1 className="text-2xl lg:text-3xl text-gray-900 mb-2">Q&A</h1>
                        <p className="text-gray-600 text-sm lg:text-base">
                            궁금한 점이나 문의사항을 남겨주시면 빠르게 답변해 드립니다
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
                    <h1 className="text-2xl lg:text-3xl text-gray-900 mb-2">Q&A</h1>
                    <p className="text-gray-600 text-sm lg:text-base">
                        궁금한 점이나 문의사항을 남겨주시면 빠르게 답변해 드립니다
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
                                    <h2 className="text-lg font-semibold text-gray-900">전체 Q&A ({total}개)</h2>
                                    <Link
                                        href="./qna/new"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                                    >
                                        질문 작성
                                    </Link>
                                </div>

                                {/* 필터 옵션 */}
                                <div className="mb-6 space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setFilters({ isAnswered: undefined })}
                                            className={`px-3 py-1 rounded-full text-sm ${
                                                filters.isAnswered === undefined
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            전체
                                        </button>
                                        <button
                                            onClick={() => setFilters({ isAnswered: false })}
                                            className={`px-3 py-1 rounded-full text-sm ${
                                                filters.isAnswered === false
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            답변 대기
                                        </button>
                                        <button
                                            onClick={() => setFilters({ isAnswered: true })}
                                            className={`px-3 py-1 rounded-full text-sm ${
                                                filters.isAnswered === true
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            답변 완료
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <QnAList
                            qnaList={qnaList}
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
