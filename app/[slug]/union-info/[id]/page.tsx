'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnionInfo, useIncrementUnionInfoViews, useDeleteUnionInfo, useDeleteUnionInfoFile } from '@/app/_lib/features/union-info/api/useUnionInfoHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import UnionNavigation from '@/app/_lib/widgets/union/navigation/Navigation';
import UnionHeader from '@/app/_lib/widgets/union/header/UnionHeader';
import { User, Eye, Calendar, Paperclip, Download, Trash2 } from 'lucide-react';
import { fileApi } from '@/app/_lib/shared/hooks/file/fileApi';

interface UnionInfoDetailPageProps {
    params: Promise<{
        slug: string;
        id: string;
    }>;
}

const UnionInfoDetailPage = ({ params }: UnionInfoDetailPageProps) => {
    const router = useRouter();
    const { slug, id } = use(params);
    const postId = parseInt(id);
    const { isLoading: isUnionLoading } = useSlug();
    const { user, isAdmin } = useAuth();
    
    const { data: post, isLoading, error } = useUnionInfo(postId);
    const { mutate: incrementViews } = useIncrementUnionInfoViews();
    const { mutate: deletePost } = useDeleteUnionInfo();
    const { mutate: deleteFile } = useDeleteUnionInfoFile();
    const openConfirmModal = useModalStore((state) => state.openConfirmModal);

    // 조회수 증가 (컴포넌트 마운트 시 1회)
    useEffect(() => {
        if (postId) {
            incrementViews(postId);
        }
    }, [postId, incrementViews]);

    const handleDelete = () => {
        openConfirmModal({
            title: '게시글 삭제',
            message: '정말로 이 게시글을 삭제하시겠습니까? 첨부된 파일도 함께 삭제됩니다.',
            onConfirm: () => deletePost(postId),
        });
    };

    const handleFileDownload = async (path: string, fileName: string) => {
        try {
            const url = await fileApi.getDownloadUrl(path, fileName);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Download failed', err);
            alert('파일 다운로드에 실패했습니다.');
        }
    };

    const handleFileDelete = (fileId: string, filePath: string) => {
        openConfirmModal({
            title: '파일 삭제',
            message: '정말로 이 파일을 삭제하시겠습니까?',
            onConfirm: () => deleteFile({ fileId, filePath, postId }),
        });
    };

    const isMine = post?.author_id === user?.id;
    const canEdit = isMine || isAdmin;

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (isUnionLoading || isLoading) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-gray-400">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-[#D9534F]">
                        {error?.message || '게시글을 찾을 수 없습니다.'}
                    </p>
                </div>
            </div>
        );
    }

    const authorName = (post.author as { name: string } | null)?.name || '알 수 없음';

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex flex-col gap-6 mb-[80px]">
                    <div className="flex justify-between items-center">
                        <UnionHeader />
                        <UnionNavigation />
                    </div>
                    <Separator className="bg-[#CCCCCC]" />
                </div>

                <div className="space-y-8">
                    {/* 제목 영역 */}
                    <div className="flex justify-between items-start border-b border-[#CCCCCC] pb-6">
                        <h2 className="text-[32px] font-bold text-[#5FA37C] flex-1 pr-4">{post.title}</h2>
                        <div className="flex gap-2 shrink-0">
                            {canEdit && (
                                <>
                                    <Button 
                                        className="bg-white border border-[#4E8C6D] text-[#4E8C6D] hover:bg-[#F5F5F5] cursor-pointer" 
                                        onClick={() => router.push(`/${slug}/union-info/${id}/edit`)}
                                    >
                                        수정
                                    </Button>
                                    <Button 
                                        className="bg-[#D9534F] text-white hover:bg-[#D9534F]/90 cursor-pointer" 
                                        onClick={handleDelete}
                                    >
                                        삭제
                                    </Button>
                                </>
                            )}
                            <Button 
                                className="bg-[#E6E6E6] text-[#5FA37C] hover:bg-[#E6E6E6]/80 cursor-pointer" 
                                onClick={() => router.push(`/${slug}/union-info`)}
                            >
                                목록
                            </Button>
                        </div>
                    </div>

                    {/* 메타 정보 */}
                    <div className="flex gap-6 text-[14px] text-[#AFAFAF] pb-4">
                        <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            작성자: {authorName}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            작성일: {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </span>
                        <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            조회수: {post.views}
                        </span>
                    </div>

                    {/* 본문 */}
                    <div 
                        className="min-h-[200px] whitespace-pre-wrap py-4 prose prose-lg max-w-none text-[18px] leading-relaxed text-gray-800 bg-white rounded-[12px] border border-[#CCCCCC] p-6" 
                        dangerouslySetInnerHTML={{ __html: post.content }} 
                    />

                    {/* 첨부파일 영역 */}
                    {post.files && post.files.length > 0 && (
                        <div className="mt-8 border border-[#CCCCCC] rounded-[12px] p-6">
                            <h3 className="text-[18px] font-bold text-[#5FA37C] mb-4 flex items-center gap-2">
                                <Paperclip className="h-5 w-5" />
                                첨부파일 ({post.files.length})
                            </h3>
                            <div className="space-y-2">
                                {post.files.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-3 border rounded-[8px] bg-[#F5F5F5] hover:bg-[#E6E6E6] transition-colors"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <Paperclip className="h-4 w-4 text-[#5FA37C] shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-medium truncate text-[14px] text-gray-800">{file.name}</p>
                                                <p className="text-[12px] text-gray-500">
                                                    {formatFileSize(file.size)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 cursor-pointer"
                                                onClick={() => handleFileDownload(file.path, file.name)}
                                                title="다운로드"
                                            >
                                                <Download className="h-4 w-4 text-gray-600" />
                                            </Button>
                                            {canEdit && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                                    onClick={() => handleFileDelete(file.id, file.path)}
                                                    title="삭제"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default UnionInfoDetailPage;

