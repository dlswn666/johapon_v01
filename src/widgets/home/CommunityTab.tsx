'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { MessageCircle } from 'lucide-react';

interface CommunityPost {
    id: string; // 정보공유방 API는 UUID를 사용
    title: string;
    content: string;
    author: string;
    date: string;
    category?: string;
    views?: number;
    created_at?: string;
}

interface CommunityTabProps {
    // props는 제거하고 내부에서 데이터를 가져오도록 변경
}

export default function CommunityTab({}: CommunityTabProps) {
    const params = useParams();
    const router = useRouter();
    const slug = params.homepage as string;

    const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 최신 4개 정보공유방 게시글 가져오기
    useEffect(() => {
        const fetchCommunityPosts = async () => {
            if (!slug) return;

            try {
                setLoading(true);
                const queryParams = new URLSearchParams({
                    page: '1',
                    page_size: '4',
                });

                const response = await fetch(`/api/tenant/${slug}/boards/share?${queryParams}`);

                if (!response.ok) {
                    throw new Error(`API 호출 실패: ${response.status}`);
                }

                const data = await response.json();

                if (data.success && data.items) {
                    // 데이터베이스 데이터를 CommunityPost 형태로 변환
                    const transformedPosts: CommunityPost[] = data.items.map((post: any) => {
                        // content가 JSON 형식인지 확인하고 파싱
                        let contentText = post.content;
                        try {
                            const parsed = JSON.parse(post.content);
                            if (Array.isArray(parsed)) {
                                // Quill.js 델타 형식인 경우 텍스트만 추출
                                contentText = parsed
                                    .map((op: any) => (typeof op.insert === 'string' ? op.insert : ''))
                                    .join('')
                                    .trim();
                            }
                        } catch {
                            // JSON이 아닌 경우 그대로 사용
                            contentText = post.content;
                        }

                        // HTML 태그 제거하고 길이 제한
                        contentText = contentText.replace(/<[^>]*>/g, '').substring(0, 200);

                        return {
                            id: post.id,
                            title: post.title,
                            content: contentText,
                            author: post.created_by || '익명',
                            date: new Date(post.created_at).toISOString().split('T')[0], // YYYY-MM-DD 형식
                            category: post.category_name || '정보공유',
                            views: 0, // 현재 DB에 조회수 필드가 없으므로 기본값
                            created_at: post.created_at,
                        };
                    });

                    setCommunityPosts(transformedPosts);
                } else {
                    setCommunityPosts([]);
                }
            } catch (err) {
                console.error('정보공유방 게시글 가져오기 실패:', err);
                setError(err instanceof Error ? err.message : '정보공유방 게시글을 가져오는데 실패했습니다.');
                setCommunityPosts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCommunityPosts();
    }, [slug]);

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

    if (communityPosts.length === 0) {
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
                    onClick={() => handlePostClick(communityPosts[0].id)}
                >
                    <h4 className="text-lg mb-3 text-purple-900 hover:text-purple-700 transition-colors">
                        {communityPosts[0].title}
                    </h4>
                    <p className="text-sm text-purple-700 mb-4 leading-relaxed line-clamp-3 overflow-hidden">
                        {communityPosts[0].content}
                    </p>
                    <div className="flex items-center justify-between text-sm text-purple-600">
                        <span>{communityPosts[0].author}</span>
                        <span>{communityPosts[0].date}</span>
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
                    {communityPosts.slice(1, 4).map((post, index) => (
                        <div
                            key={post.id}
                            className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                                index !== communityPosts.slice(1, 4).length - 1 ? 'border-b border-gray-100' : ''
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
