'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { MessageSquare, Plus } from 'lucide-react';
import BannerAd from '@/widgets/common/BannerAd';
import PostCard from '@/components/community/PostCard';
import ListFilter from '@/components/community/ListFilter';
import { sampleCommunityPosts } from '@/lib/mockData';
import type { CommunityPost } from '@/entities/community/model/types';

export default function TenantCommunityPage() {
    const router = useRouter();
    const [posts, setPosts] = useState<CommunityPost[]>(sampleCommunityPosts);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Filter and sort posts
    const filteredPosts = useMemo(() => {
        let result = posts;

        // Apply category filter
        if (selectedCategory !== 'all') {
            result = result.filter((post) => post.category === selectedCategory);
        }

        // Apply search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            result = result.filter(
                (post) =>
                    post.title.toLowerCase().includes(searchLower) ||
                    post.content.toLowerCase().includes(searchLower) ||
                    post.author.toLowerCase().includes(searchLower)
            );
        }

        // Sort by date (most recent first)
        result = [...result].sort(
            (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
        );

        return result;
    }, [posts, selectedCategory, searchTerm]);

    const handleLikePost = (postId: number) => {
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.id === postId
                    ? {
                          ...post,
                          likes: post.isLiked ? (post.likes || 0) - 1 : (post.likes || 0) + 1,
                          isLiked: !post.isLiked,
                      }
                    : post
            )
        );
    };

    const handleSearch = () => {
        // 검색 버튼 클릭 시 추가 동작이 필요하면 여기에 구현
        console.log('검색 실행:', searchTerm);
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
                            onSearchChange={setSearchTerm}
                            onCategoryChange={setSelectedCategory}
                            onSearch={handleSearch}
                            onWriteClick={handleWriteClick}
                            totalCount={posts.length}
                        />

                        {/* Posts List */}
                        <div className="space-y-4">
                            {filteredPosts.length > 0 ? (
                                filteredPosts.map((post) => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        onLike={() => handleLikePost(post.id)}
                                        onClick={() => handlePostClick(post.id)}
                                    />
                                ))
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

                        {/* Load More Button */}
                        {filteredPosts.length >= 10 && (
                            <div className="text-center">
                                <Button variant="outline" size="lg">
                                    더 많은 게시글 보기
                                </Button>
                            </div>
                        )}
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
