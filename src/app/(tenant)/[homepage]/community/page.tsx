'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { MessageSquare, Plus } from 'lucide-react';
import BannerAd from '@/widgets/common/BannerAd';
import PostCard from '@/components/community/PostCard';
import ListFilter from '@/components/community/ListFilter';
import { useInfoShare } from '@/shared/hooks/useInfoShare';
import type { CommunityPost } from '@/entities/community/model/types';

export default function TenantCommunityPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { posts, categories, loading, error, total, hasMore, setFilter, observerRef, refresh } = useInfoShare({
        pageSize: 10,
    });
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

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

    // 정보공유방 게시글을 CommunityPost 형식으로 변환 (메모이제이션)
    const convertedPosts: CommunityPost[] = useMemo(
        () =>
            posts.map((post) => ({
                id: parseInt(post.id),
                title: post.title,
                content: post.content,
                author: post.author,
                date: post.date,
                createdAt: post.date,
                category: post.category,
                views: post.views || 0,
                likes: post.likes || 0,
                isLiked: post.isLiked || false,
                commentsCount: post.commentsCount || 0,
            })),
        [posts]
    );

    const handleLikePost = (postId: number) => {
        // TODO: 추후 좋아요 API 연동
        console.log('좋아요 기능:', postId);
    };

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

    const handlePostClick = (postId: number) => {
        router.push(`community/${postId}`);
    };

    const handleWriteClick = () => {
        router.push('community/new');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Title */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-8">
                    <h1 className="text-2xl lg:text-3xl text-gray-900 mb-2">정보공유방</h1>
                    <p className="text-gray-600 text-sm lg:text-base">조합원들과 함께 정보를 나누고 소통하는 공간</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Sidebar - Banners */}
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd />
                    </div>

                    {/* Center Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Search and Filter */}
                        <ListFilter
                            searchTerm={searchTerm}
                            selectedCategory={selectedCategory}
                            onSearchChange={handleSearchTermChange}
                            onCategoryChange={handleCategoryChange}
                            onSearch={handleSearch}
                            onWriteClick={handleWriteClick}
                            totalCount={total}
                        />

                        {/* Error Display */}
                        {error && (
                            <Card>
                                <CardContent className="p-4 text-center text-red-600">
                                    <p>오류가 발생했습니다: {error}</p>
                                    <Button variant="outline" onClick={refresh} className="mt-2">
                                        다시 시도
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Posts List */}
                        <div className="space-y-4">
                            {loading ? (
                                <Card>
                                    <CardContent className="p-8 text-center">
                                        <p className="text-gray-600">로딩 중...</p>
                                    </CardContent>
                                </Card>
                            ) : convertedPosts.length > 0 ? (
                                <>
                                    {convertedPosts.map((post) => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            onLike={() => handleLikePost(post.id)}
                                            onClick={() => handlePostClick(post.id)}
                                        />
                                    ))}
                                    {/* 무한 스크롤 트리거 */}
                                    {hasMore && (
                                        <div ref={observerRef} className="h-4 flex justify-center">
                                            <p className="text-gray-500">더 많은 게시글을 불러오는 중...</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Card>
                                    <CardContent className="p-8 text-center">
                                        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg text-gray-900 mb-2">게시글이 없습니다</h3>
                                        <p className="text-gray-600 mb-4">
                                            {searchTerm || selectedCategory !== 'all'
                                                ? '검색 조건에 맞는 게시글이 없습니다.'
                                                : '첫 번째 게시글을 작성해보세요.'}
                                        </p>
                                        <Button
                                            onClick={handleWriteClick}
                                            className="bg-purple-600 hover:bg-purple-700"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            게시글 작성하기
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* 무한 스크롤이 적용되어 Load More 버튼은 제거됨 */}
                    </div>

                    {/* Right Sidebar - Banners */}
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd />
                    </div>
                </div>
            </div>
        </div>
    );
}
