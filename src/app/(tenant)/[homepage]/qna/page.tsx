'use client';

import QnAList from '@/widgets/qna/QnAList';
import BannerAd from '@/widgets/common/BannerAd';
import ListFilter, { type ListCategoryOption } from '@/components/common/ListFilter';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useQnA } from '@/shared/hooks/useQnA';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function TenantQnAPage() {
    const { qnas, categories, loading, error, total, hasMore, setFilter, observerRef } = useQnA({ pageSize: 10 });
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    // ListCategoryOption 형식으로 변환
    const listCategories: ListCategoryOption[] = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        count: cat.count || 0,
    }));

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        setFilter({
            categoryKey: category === 'all' ? undefined : category,
            searchTerm: searchTerm || undefined,
        });
    };

    const handleSearchTermChange = (term: string) => {
        setSearchTerm(term);
    };

    const handleSearch = () => {
        setFilter({
            categoryKey: selectedCategory === 'all' ? undefined : selectedCategory,
            searchTerm: searchTerm || undefined,
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-8">
                    <h1 className="text-2xl lg:text-3xl text-gray-900 mb-2">Q&A 게시판</h1>
                    <p className="text-gray-600 text-sm lg:text-base">
                        궁금한 점을 질문하고 전문가의 답변을 받아보세요
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
                                <ListFilter
                                    categories={listCategories}
                                    selectedCategory={selectedCategory}
                                    onCategoryChange={handleCategoryChange}
                                    searchTerm={searchTerm}
                                    onSearchTermChange={handleSearchTermChange}
                                    onSearch={handleSearch}
                                    variant="desktop"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4 flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                    {loading ? '로딩 중...' : `총 ${total}개의 질문`}
                                </div>
                                <Link href="./qna/new" className="inline-block">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                        <Plus className="h-4 w-4 mr-2" />
                                        질문하기
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <QnAList
                            qnas={qnas}
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
