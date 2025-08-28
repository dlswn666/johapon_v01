'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { MessageCircle } from 'lucide-react';
import { useCommunityStore } from '@/shared/store/communityStore';

interface CommunityTabProps {
    // props는 제거하고 내부에서 데이터를 가져오도록 변경
}

export default function CommunityTab({}: CommunityTabProps) {
    const params = useParams();
    const router = useRouter();
    const slug = params.homepage as string;

    // useCommunityStore를 사용하여 최신 4개 정보공유방 게시글 가져오기
    const { posts, loading, error, fetchPosts, resetState } = useCommunityStore();

    useEffect(() => {
        if (slug) {
            // 페이지 크기를 4로 설정하여 최신 4개만 가져오기
            const currentState = useCommunityStore.getState();
            currentState.pageSize = 4;
            fetchPosts(slug, true).catch(console.error);
        }

        return () => {
            resetState();
        };
    }, [slug, fetchPosts, resetState]);

    // 더보기 버튼 클릭 핸들러
    const handleViewMore = () => {
        router.push(`/${slug}/community`);
    };

    // 개별 게시글 클릭 핸들러
    const handlePostClick = (postId: string) => {
        router.push(`/${slug}/community/${postId}`);
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300 animate-pulse" />
                <p>정보공유방 게시글을 불러오는 중...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-red-300" />
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (!posts || posts.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>정보공유방 게시글이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 flex-1 sm:grid sm:grid-cols-2">
            <div className="flex-1 sm:col-span-1">
                <div
                    className="bg-purple-50 border border-purple-200 rounded-lg p-6 h-full cursor-pointer hover:bg-purple-100 transition-colors"
                    onClick={() => handlePostClick(posts[0].id)}
                >
                    <h4 className="text-lg mb-3 text-purple-900 hover:text-purple-700 transition-colors">
                        {posts[0].title}
                    </h4>
                    <p className="text-sm text-purple-700 mb-4 leading-relaxed line-clamp-3 overflow-hidden">
                        {posts[0].content}
                    </p>
                    <div className="flex items-center justify-between text-sm text-purple-600">
                        <span>{posts[0].author}</span>
                        <span>{posts[0].date}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 sm:col-span-1 flex flex-col h-full">
                <div className="flex justify-end mb-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-purple-600 border-purple-600 hover:bg-purple-50"
                        onClick={handleViewMore}
                    >
                        + 더보기
                    </Button>
                </div>
                <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden flex-1">
                    {posts.slice(1, 4).map((post, index) => (
                        <div
                            key={post.id}
                            className={`flex items-center justify-between p-3 hover:bg-blue-50 transition-colors cursor-pointer ${
                                index !== posts.slice(1, 4).length - 1 ? 'border-b border-gray-100' : ''
                            }`}
                            onClick={() => handlePostClick(post.id)}
                        >
                            <div className="flex-1 pr-3">
                                <h5 className="text-sm text-gray-900 hover:text-purple-600 transition-colors leading-tight">
                                    {post.title}
                                </h5>
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                    <span>{post.author}</span>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">{post.date}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
