'use client';

import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Eye, MessageCircle, Heart, User, Calendar, UserX, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { CommunityPostItem } from '@/entities/community/model/types';

interface CommunityPostListProps {
    posts: CommunityPostItem[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    observerRef: (node: HTMLElement | null) => void;
}

export default function CommunityPostList({ posts, loading, error, hasMore, observerRef }: CommunityPostListProps) {
    const params = useParams();
    const homepage = params?.homepage as string;

    // 날짜 포맷팅
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return '오늘';
        } else if (diffDays === 2) {
            return '어제';
        } else if (diffDays <= 7) {
            return `${diffDays - 1}일 전`;
        } else {
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        }
    };

    // 인기도 계산 (좋아요 + 댓글 수)
    const getPopularityScore = (post: CommunityPostItem) => {
        return post.likes + post.comments;
    };

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center py-8">
                        <p className="text-red-600 mb-2">오류가 발생했습니다</p>
                        <p className="text-gray-600 text-sm">{error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {posts.length === 0 && !loading ? (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center py-12">
                            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 등록된 게시글이 없습니다</h3>
                            <p className="text-gray-600 mb-4">
                                조합원들과 자유롭게 소통할 수 있는 첫 번째 글을 작성해 보세요.
                            </p>
                            <Link
                                href={`/${homepage}/community/new`}
                                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                            >
                                <MessageCircle className="h-4 w-4 mr-2" />첫 게시글 작성하기
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {posts.map((post, index) => (
                        <Card key={post.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            {/* 커뮤니티 타입 표시 */}
                                            <Badge variant="outline" className="text-xs px-2 py-1 border-purple-300 text-purple-700">
                                                <Users className="h-3 w-3 mr-1" />
                                                커뮤니티
                                            </Badge>
                                            
                                            {/* 익명 여부 */}
                                            {post.isAnonymous && (
                                                <Badge variant="secondary" className="text-xs px-2 py-1 bg-gray-100 text-gray-700">
                                                    <UserX className="h-3 w-3 mr-1" />
                                                    익명
                                                </Badge>
                                            )}
                                            
                                            {/* 인기 게시글 표시 */}
                                            {getPopularityScore(post) >= 10 && (
                                                <Badge variant="default" className="bg-red-500 text-xs px-2 py-1">
                                                    <TrendingUp className="h-3 w-3 mr-1" />
                                                    인기
                                                </Badge>
                                            )}
                                            
                                            {/* 많은 좋아요 게시글 */}
                                            {post.likes >= 5 && (
                                                <Badge variant="outline" className="text-xs px-2 py-1 border-pink-300 text-pink-700">
                                                    <Heart className="h-3 w-3 mr-1" />
                                                    좋아요 {post.likes}
                                                </Badge>
                                            )}
                                            
                                            {/* 많은 댓글 게시글 */}
                                            {post.comments >= 5 && (
                                                <Badge variant="outline" className="text-xs px-2 py-1 border-blue-300 text-blue-700">
                                                    <MessageCircle className="h-3 w-3 mr-1" />
                                                    댓글 {post.comments}
                                                </Badge>
                                            )}

                                            <Badge variant="outline" className="text-xs ml-auto">
                                                {post.category}
                                            </Badge>
                                        </div>

                                        <Link href={`/${homepage}/community/${post.id}`} className="block group">
                                            <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors mb-2 line-clamp-2">
                                                {post.title}
                                            </h3>
                                            <p className="text-gray-600 text-sm line-clamp-2 mb-3">{post.content}</p>
                                        </Link>

                                        <div className="flex items-center justify-between text-sm text-gray-500">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-1">
                                                    {post.isAnonymous ? (
                                                        <UserX className="h-4 w-4" />
                                                    ) : (
                                                        <User className="h-4 w-4" />
                                                    )}
                                                    <span>{post.author}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>{formatDate(post.date)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <div className="flex items-center space-x-1">
                                                    <Eye className="h-4 w-4" />
                                                    <span>{post.views.toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Heart className="h-4 w-4" />
                                                    <span>{post.likes.toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <MessageCircle className="h-4 w-4" />
                                                    <span>{post.comments.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* 무한 스크롤 로딩 트리거 */}
                    {hasMore && (
                        <div ref={observerRef} className="h-20 flex items-center justify-center">
                            {loading && (
                                <div className="flex items-center space-x-2 text-gray-600">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                                    <span>더 많은 게시글을 불러오는 중...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 로딩 중이지만 첫 페이지가 아닌 경우 */}
                    {loading && posts.length === 0 && (
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">게시글을 불러오는 중...</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 더 이상 불러올 데이터가 없는 경우 */}
                    {!hasMore && posts.length > 0 && (
                        <div className="text-center py-4">
                            <p className="text-gray-500 text-sm">모든 게시글을 확인했습니다.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
