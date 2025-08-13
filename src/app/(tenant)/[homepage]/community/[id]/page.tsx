'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import {
    ArrowLeft,
    Edit,
    Trash2,
    FileText,
    Users,
    ThumbsUp,
    MessageCircle,
    Eye,
    Calendar,
    User,
    Download,
} from 'lucide-react';
import BannerAd from '@/widgets/common/BannerAd';
import RichTextEditor from '@/components/community/RichTextEditor';
import { sampleCommunityPosts } from '@/lib/mockData';
import type { CommunityPost, AttachedFile } from '@/entities/community/model/types';

export default function CommunityDetailPage() {
    const router = useRouter();
    const params = useParams();
    const postId = Number(params.id);

    const [post, setPost] = useState<CommunityPost | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 실제로는 API에서 데이터를 가져와야 함
        const foundPost = sampleCommunityPosts.find((p) => p.id === postId);
        if (foundPost) {
            setPost(foundPost);
            // 조회수 증가 (실제로는 API 호출)
            const updatedPost = { ...foundPost, views: (foundPost.views || 0) + 1 };
            setPost(updatedPost);
        }
        setLoading(false);
    }, [postId]);

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
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleLike = () => {
        if (!post) return;

        setPost((prev) =>
            prev
                ? {
                      ...prev,
                      likes: prev.isLiked ? (prev.likes || 0) - 1 : (prev.likes || 0) + 1,
                      isLiked: !prev.isLiked,
                  }
                : null
        );
    };

    const handleEdit = () => {
        router.push(`/community/${postId}/edit`);
    };

    const handleDelete = () => {
        if (confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
            // 실제로는 API 호출
            alert('게시글이 삭제되었습니다.');
            router.push('/community');
        }
    };

    const handleFileDownload = (file: AttachedFile) => {
        if (file.url) {
            const link = document.createElement('a');
            link.href = file.url;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl text-gray-900 mb-4">게시글을 찾을 수 없습니다</h2>
                    <Button onClick={() => router.push('/community')}>목록으로 돌아가기</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Button variant="ghost" onClick={() => router.push('/community')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                목록으로
                            </Button>
                            <div>
                                <h1 className="text-2xl lg:text-3xl text-gray-900">게시글 상세</h1>
                                <p className="text-gray-600 mt-1">정보공유방</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button variant="outline" onClick={handleEdit}>
                                <Edit className="h-4 w-4 mr-2" />
                                수정
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleDelete}
                                className="text-red-600 hover:text-red-700"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                삭제
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Sidebar - Banner */}
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd />
                    </div>

                    {/* Center Content */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Users className="h-5 w-5" />
                                    <span>게시글 정보</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Basic Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Title */}
                                    <div className="md:col-span-2">
                                        <Label>게시글 제목</Label>
                                        <div className="mt-2 p-3 bg-gray-50 rounded-md">
                                            <h2 className="text-lg text-gray-900">{post.title}</h2>
                                        </div>
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <Label>카테고리</Label>
                                        <div className="mt-2">
                                            <Badge className={getCategoryColorClass(post.category)}>
                                                {post.category}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Author Info */}
                                    <div>
                                        <Label>작성자</Label>
                                        <div className="mt-2 p-3 bg-gray-50 rounded-md flex items-center">
                                            <User className="h-4 w-4 mr-2 text-gray-500" />
                                            {post.author}
                                        </div>
                                    </div>

                                    {/* Post Info */}
                                    <div className="md:col-span-2">
                                        <Label>게시글 정보</Label>
                                        <div className="mt-2 p-3 bg-gray-50 rounded-md">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div className="flex items-center">
                                                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                                                    {formatDate(post.createdAt || post.date)}
                                                </div>
                                                <div className="flex items-center">
                                                    <Eye className="h-4 w-4 mr-2 text-gray-500" />
                                                    조회 {post.views || 0}
                                                </div>
                                                <div className="flex items-center">
                                                    <MessageCircle className="h-4 w-4 mr-2 text-gray-500" />
                                                    댓글 {post.comments || 0}
                                                </div>
                                                <div className="flex items-center">
                                                    <ThumbsUp className="h-4 w-4 mr-2 text-gray-500" />
                                                    좋아요 {post.likes || 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* File Attachments */}
                                {post.attachments && post.attachments.length > 0 && (
                                    <div>
                                        <Label>첨부파일</Label>
                                        <div className="mt-2 space-y-2">
                                            {post.attachments.map((file) => (
                                                <div
                                                    key={file.id}
                                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <FileText className="h-4 w-4 text-gray-500" />
                                                        <div>
                                                            <p className="text-sm text-gray-900">{file.name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {formatFileSize(file.size)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleFileDownload(file)}
                                                        className="text-purple-600 hover:text-purple-700"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Content */}
                                <div>
                                    <Label>게시글 내용</Label>
                                    <div className="mt-2">
                                        <RichTextEditor
                                            content={post.content}
                                            onChange={() => {}} // 읽기 전용
                                            readonly={true}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center">
                            <Button
                                onClick={handleLike}
                                className={`flex items-center space-x-2 ${
                                    post.isLiked
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                            >
                                <ThumbsUp className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                                <span>좋아요 {post.likes || 0}</span>
                            </Button>

                            <div className="flex space-x-2">
                                <Button variant="outline" onClick={() => router.push('/community')}>
                                    목록으로
                                </Button>
                                <Button onClick={handleEdit} className="bg-purple-600 hover:bg-purple-700 text-white">
                                    <Edit className="h-4 w-4 mr-2" />
                                    수정하기
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar - Banner */}
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd />
                    </div>
                </div>
            </div>
        </div>
    );
}
