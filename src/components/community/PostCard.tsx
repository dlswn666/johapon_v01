'use client';

import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ThumbsUp, MessageCircle, Eye, Calendar, User } from 'lucide-react';
import type { CommunityPost } from '@/entities/community/model/types';

interface PostCardProps {
    post: CommunityPost;
    onLike?: () => void;
    onClick?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onClick }) => {
    const getCategoryColorClass = (category: string) => {
        switch (category) {
            case '일반토론':
                return 'bg-blue-100 text-blue-800';
            case '정보공유':
                return 'bg-green-100 text-green-800';
            case '모임후기':
                return 'bg-purple-100 text-purple-800';
            case '공지':
                return 'bg-red-100 text-red-800';
            case '질문답변':
                return 'bg-orange-100 text-orange-800';
            case '건의사항':
                return 'bg-teal-100 text-teal-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    const truncateContent = (content: string, length: number = 150) => {
        // HTML 태그 제거
        const textContent = content.replace(/<[^>]*>/g, '');
        if (textContent.length <= length) return textContent;
        return textContent.substring(0, length) + '...';
    };

    return (
        <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={onClick}>
            <CardContent className="p-6">
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                                <Badge className={getCategoryColorClass(post.category)}>{post.category}</Badge>
                                <div className="flex items-center text-sm text-gray-500">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {formatDate(post.createdAt || post.date)}
                                </div>
                            </div>
                            <h3 className="text-lg text-gray-900 mb-2 line-clamp-2 hover:text-purple-600 transition-colors">
                                {post.title}
                            </h3>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="text-sm text-gray-600 leading-relaxed">
                        <p className="line-clamp-3">{truncateContent(post.content, 150)}</p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        {/* Author */}
                        <div className="flex items-center text-sm text-gray-500">
                            <User className="h-4 w-4 mr-1" />
                            {post.author}
                        </div>

                        {/* Actions and Stats */}
                        <div className="flex items-center space-x-4">
                            {/* Views */}
                            <div className="flex items-center text-sm text-gray-500">
                                <Eye className="h-4 w-4 mr-1" />
                                {post.views || 0}
                            </div>

                            {/* Comments */}
                            <div className="flex items-center text-sm text-gray-500">
                                <MessageCircle className="h-4 w-4 mr-1" />
                                {post.comments || 0}
                            </div>

                            {/* Like Button */}
                            {onLike && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLike();
                                    }}
                                    className={`flex items-center space-x-1 ${
                                        post.isLiked
                                            ? 'text-red-600 hover:text-red-700'
                                            : 'text-gray-500 hover:text-red-600'
                                    }`}
                                >
                                    <ThumbsUp className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                                    <span className="text-sm">{post.likes || 0}</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default PostCard;
